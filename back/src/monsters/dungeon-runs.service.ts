import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { ItemRarity, PlayerBuffType, Prisma, StatType } from '../../generated/client';
import { ItemView } from '../common/views/item.view';
import { ItemGeneratorService } from '../items/item-generator.service';
import { requireLandmark } from '../locations/landmarks';
import { PrismaService } from '../prisma.service';
import { progressionAfterExperience } from '../users/level-progression';
import { UserView } from '../users/user.view';
import { UsersService } from '../users/users.service';
import { rollDeathCurse } from './death-curse';
import type { GeneratedMonster } from './monster-generator.service';
import { MonsterGeneratorService } from './monster-generator.service';
import { rollDungeonLootRarity } from './monster-loot';

type Combatant = {
  name: string;
  health: number;
  maxHealth: number;
  damage: number;
  defense: number;
  dodge: number;
  criticalChance: number;
  criticalDamage: number;
};

type DungeonEvent = { actor: 'PLAYER' | 'MONSTER'; damage: number; critical: boolean; dodged: boolean };
type DungeonOpponent = {
  id: string;
  monsterType: string;
  image: string;
  isBoss: boolean;
  status: 'AVAILABLE' | 'LOCKED' | 'DEFEATED';
  monster: Combatant & { level: number; rewardGold: number; rewardExperience: number };
};
type DungeonRewardItem = ReturnType<typeof ItemView.render> & {
  quantity: 1;
  inventoryItemId?: number;
  addedToInventory: boolean;
  inventoryFull: boolean;
};
export type DungeonRunState = {
  id: string;
  dungeon: string;
  status: 'ACTIVE' | 'VICTORY' | 'DEFEAT';
  startedAt: string;
  player: Combatant;
  opponents: DungeonOpponent[];
  latestEvents: DungeonEvent[];
  lastExperience: number;
  experienceBonusPercent: number;
  goldBonusPercent: number;
  rewards: null | { gold: number; item: DungeonRewardItem };
};

const DUNGEON_ROLES = [
  { suffix: 'Stalker', image: '/images/dungeons/shadow-stalker.webp', health: 1.35, damage: 1.2, boss: false },
  { suffix: 'Stone Brute', image: '/images/dungeons/stone-brute.webp', health: 1.55, damage: 1.3, boss: false },
  { suffix: 'Arcane Wraith', image: '/images/dungeons/arcane-wraith.webp', health: 1.3, damage: 1.4, boss: false },
  { suffix: 'Ancient Warden', image: '/images/dungeons/ancient-warden.webp', health: 2.3, damage: 1.65, boss: true },
] as const;

const DUNGEON_PREFIXES: Record<string, string> = {
  EMBERDEEP: 'Flamebound',
  HOLLOWGATE: 'Hollow',
  ICEVAULT: 'Frostbound',
  RAVENCRYPT: 'Graveborn',
};

@Injectable()
export class DungeonRunsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly monsterGenerator: MonsterGeneratorService,
    private readonly usersService: UsersService,
    private readonly itemGenerator: ItemGeneratorService,
  ) {}

  async active(userId: number): Promise<DungeonRunState | null> {
    const profile = await this.prisma.gameProfile.findUnique({
      where: { userId },
      include: { dungeonRun: true },
    });
    if (!profile) throw new NotFoundException('Game profile not found');
    return profile.dungeonRun ? this.parseState(profile.dungeonRun.state) : null;
  }

  async enter(userId: number, name: string): Promise<DungeonRunState> {
    const user = await this.usersService.findCurrentUser(userId);
    if (!user?.gameProfile) throw new NotFoundException('Game profile not found');
    requireLandmark(name, 'dungeon', user.gameProfile);
    const renderedPlayer = UserView.renderCurrent(user);

    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${userId})`;
      const activeRun = await tx.dungeonRun.findUnique({ where: { gameProfileId: user.gameProfile!.id } });
      if (activeRun) return this.parseState(activeRun.state);

      const where = { gameProfileId_dungeon: { gameProfileId: user.gameProfile!.id, dungeon: name } };
      const visit = await tx.dungeonVisit.findUnique({ where });
      if (visit && visit.nextEntryAt > new Date()) {
        throw new BadRequestException('Dungeon is resting. You can enter once per hour.');
      }
      await tx.dungeonVisit.upsert({
        where,
        create: { gameProfileId: user.gameProfile!.id, dungeon: name, nextEntryAt: new Date(Date.now() + 3_600_000) },
        update: { nextEntryAt: new Date(Date.now() + 3_600_000) },
      });

      const state = this.createRun(userId, name, renderedPlayer);
      await tx.dungeonRun.create({
        data: {
          id: state.id,
          gameProfileId: user.gameProfile!.id,
          dungeon: name,
          state: this.json(state),
        },
      });
      return state;
    });
  }

  async attack(userId: number, runId: string, opponentId: string): Promise<DungeonRunState> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${userId})`;
      const profile = await tx.gameProfile.findUnique({ where: { userId }, include: { dungeonRun: true } });
      if (!profile?.dungeonRun || profile.dungeonRun.id !== runId) {
        throw new NotFoundException('Active dungeon run not found');
      }
      const state = this.parseState(profile.dungeonRun.state);
      if (state.status !== 'ACTIVE') throw new BadRequestException('Dungeon run has already ended');
      const opponent = state.opponents.find(({ id }) => id === opponentId);
      if (!opponent) throw new NotFoundException('Dungeon opponent not found');
      if (opponent.status === 'LOCKED') throw new BadRequestException('Defeat the three guardians before the boss');
      if (opponent.status === 'DEFEATED') throw new BadRequestException('This opponent is already defeated');
      if (opponent.isBoss) {
        const backpackCount = await tx.inventoryItem.count({
          where: { gameProfileId: profile.id, isEquiped: false },
        });
        if (backpackCount >= 24) {
          throw new BadRequestException('Inventory is full. Make room before fighting the boss.');
        }
      }

      state.latestEvents = [];
      while (state.player.health > 0 && opponent.monster.health > 0) {
        this.strike(state.player, opponent.monster, 'PLAYER', state.latestEvents);
        if (opponent.monster.health <= 0) break;
        this.strike(opponent.monster, state.player, 'MONSTER', state.latestEvents);
      }

      if (state.player.health <= 0) {
        state.status = 'DEFEAT';
        await tx.dungeonRun.delete({ where: { id: runId } });
        const defeatedProfile = await tx.gameProfile.update({
          where: { id: profile.id },
          data: { mapPositionX: 1470, mapPositionY: 1040 },
        });
        await tx.gameProfileBuff.deleteMany({ where: { gameProfileId: profile.id } });
        const curse = rollDeathCurse(defeatedProfile.level);
        if (curse) {
          await tx.gameProfileBuff.create({
            data: {
              gameProfileId: profile.id,
              type: curse.type,
              value: curse.value,
              expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000),
            },
          });
        }
        return state;
      }

      opponent.status = 'DEFEATED';
      state.lastExperience = Math.round(opponent.monster.rewardExperience * (1 + state.experienceBonusPercent / 100));
      const updatedProfile = await tx.gameProfile.update({
        where: { id: profile.id },
        data: { experience: { increment: state.lastExperience }, killedMonsters: { increment: 1 } },
        select: { id: true, level: true, experience: true },
      });
      const progression = progressionAfterExperience(updatedProfile.level, updatedProfile.experience);
      if (progression.level !== updatedProfile.level || progression.experience !== updatedProfile.experience) {
        await tx.gameProfile.update({
          where: { id: profile.id },
          data: {
            level: progression.level,
            experience: progression.experience,
            freeAttributes: { increment: progression.freeAttributes },
          },
        });
      }

      const guardiansDefeated = state.opponents
        .filter(({ isBoss }) => !isBoss)
        .every(({ status }) => status === 'DEFEATED');
      const boss = state.opponents.find(({ isBoss }) => isBoss);
      if (guardiansDefeated && boss?.status === 'LOCKED') boss.status = 'AVAILABLE';

      if (opponent.isBoss) {
        const gold = Math.round(
          state.opponents.reduce((sum, entry) => sum + entry.monster.rewardGold, 0) *
            (1 + state.goldBonusPercent / 100),
        );
        const rarity = rollDungeonLootRarity();
        const item = await this.itemGenerator.generate(
          { level: opponent.monster.level, rarity, minimumRarity: ItemRarity.RARE },
          tx,
        );
        await tx.gameProfile.update({ where: { id: profile.id }, data: { gold: { increment: gold } } });
        const inventoryEntry = await tx.inventoryItem.create({
          data: { gameProfileId: profile.id, itemId: item.id, quantity: 1, slot: null, isEquiped: false },
        });
        state.status = 'VICTORY';
        state.rewards = {
          gold,
          item: {
            ...ItemView.render(item),
            quantity: 1,
            inventoryItemId: inventoryEntry.id,
            addedToInventory: true,
            inventoryFull: false,
          },
        };
        await tx.dungeonRun.delete({ where: { id: runId } });
        return state;
      }

      await tx.dungeonRun.update({ where: { id: runId }, data: { state: this.json(state) } });
      return state;
    });
  }

  async reset(userId: number, name: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${userId})`;
      const profile = await tx.gameProfile.findUnique({
        where: { userId },
        include: { dungeonRun: true },
      });
      if (!profile) throw new NotFoundException('Game profile not found');
      requireLandmark(name, 'dungeon', profile);
      if (profile.dungeonRun) throw new BadRequestException('Finish the active dungeon first');
      const where = { gameProfileId_dungeon: { gameProfileId: profile.id, dungeon: name } };
      const visit = await tx.dungeonVisit.findUnique({ where });
      if (!visit || visit.nextEntryAt <= new Date()) throw new BadRequestException('Dungeon is already available');
      const paid = await tx.gameProfile.updateMany({
        where: { id: profile.id, gems: { gte: 10 } },
        data: { gems: { decrement: 10 } },
      });
      if (paid.count !== 1) throw new BadRequestException('Not enough gems');
      await tx.dungeonVisit.delete({ where });
      return { success: true, cost: 10 };
    });
  }

  private createRun(
    userId: number,
    dungeon: string,
    player: ReturnType<typeof UserView.renderCurrent>,
  ): DungeonRunState {
    const property = (name: StatType) => player.properties.find((entry) => entry.name === name)?.value ?? 0;
    const health = Math.max(1, property(StatType.HEALTH));
    const prefix = DUNGEON_PREFIXES[dungeon] ?? 'Dungeon';
    const opponents = DUNGEON_ROLES.map((role, index) => {
      const generated = this.monsterGenerator.generate(player.level + (role.boss ? 4 : 2));
      return this.createOpponent(
        generated,
        `${prefix} ${role.suffix}`,
        role.image,
        role.health,
        role.damage,
        !!role.boss,
        index,
      );
    });
    return {
      id: randomUUID(),
      dungeon,
      status: 'ACTIVE',
      startedAt: new Date().toISOString(),
      latestEvents: [],
      lastExperience: 0,
      rewards: null,
      experienceBonusPercent:
        (player.activeBuffs.find(({ type }) => type === PlayerBuffType.EXPERIENCE)?.value ?? 0) +
        player.rewardBonuses.experiencePercent,
      goldBonusPercent: player.rewardBonuses.goldPercent,
      player: {
        name: player.name ?? `Player ${userId}`,
        health,
        maxHealth: health,
        damage: Math.max(1, property(StatType.DAMAGE)),
        defense: property(StatType.DEFENSE),
        dodge: property(StatType.DODGE),
        criticalChance: property(StatType.CRIT),
        criticalDamage: property(StatType.CRIT_DAMAGE),
      },
      opponents,
    };
  }

  private createOpponent(
    generated: GeneratedMonster,
    name: string,
    image: string,
    healthMultiplier: number,
    damageMultiplier: number,
    isBoss: boolean,
    index: number,
  ): DungeonOpponent {
    const attribute = (attributeName: string) =>
      generated.attributes.find((entry) => entry.attribute.name === attributeName)?.value ?? 0;
    const health = Math.round((40 + generated.level * 15 + attribute('ENDURANCE') * 10) * healthMultiplier);
    return {
      id: randomUUID(),
      monsterType: generated.monsterType ?? name,
      image,
      isBoss,
      status: isBoss ? 'LOCKED' : 'AVAILABLE',
      monster: {
        name,
        level: generated.level,
        health,
        maxHealth: health,
        damage: Math.ceil((3 + generated.level * 2 + attribute('STRENGTH')) * damageMultiplier),
        defense: Math.min(60, generated.level * 0.8 + attribute('ENDURANCE') + (isBoss ? 8 : 4)),
        dodge: Math.min(30, generated.level * 0.3 + attribute('AGILITY')),
        criticalChance: Math.min(30, 4 + generated.level * 0.25 + index),
        criticalDamage: isBoss ? 175 : 150,
        rewardGold: Math.max(1, Math.round(generated.rewardGold * (isBoss ? 2.5 : 1.25))),
        rewardExperience: Math.max(1, Math.round(generated.rewardExperience * (isBoss ? 2.5 : 1.5))),
      },
    };
  }

  private strike(attacker: Combatant, defender: Combatant, actor: DungeonEvent['actor'], events: DungeonEvent[]) {
    if (Math.random() * 100 < defender.dodge) {
      events.push({ actor, damage: 0, critical: false, dodged: true });
      return;
    }
    const critical = Math.random() * 100 < attacker.criticalChance;
    const rawDamage = attacker.damage * (critical ? attacker.criticalDamage / 100 : 1);
    const damage = Math.max(1, Math.round(rawDamage * (1 - defender.defense / 100)));
    defender.health = Math.max(0, defender.health - damage);
    events.push({ actor, damage, critical, dodged: false });
  }

  private parseState(state: Prisma.JsonValue): DungeonRunState {
    return state as unknown as DungeonRunState;
  }

  private json(state: DungeonRunState): Prisma.InputJsonValue {
    return state;
  }
}
