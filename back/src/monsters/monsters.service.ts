import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma.service';
import { GeneratedMonster, MonsterGeneratorService } from './monster-generator.service';
import { UsersService } from '../users/users.service';
import { UserView } from '../users/user.view';
import { PlayerBuffType, StatType } from '../../generated/client';
import { ItemGeneratorService } from '../items/item-generator.service';
import { ItemView } from '../common/views/item.view';
import { rollMonsterLootRarity, rollDungeonLootRarity } from './monster-loot';
import { requireLandmark } from '../locations/landmarks';
import { progressionAfterExperience } from '../users/level-progression';

type BattleStatus = 'ACTIVE' | 'VICTORY' | 'DEFEAT';
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
type Battle = {
  dungeon?: string;
  id: string;
  userId: number;
  status: BattleStatus;
  turn: number;
  player: Combatant;
  monster: Combatant & { id: number; level: number; rewardGold: number; rewardExperience: number };
  events: Array<{ actor: 'PLAYER' | 'MONSTER'; damage: number; critical: boolean; dodged: boolean }>;
  experienceBonusPercent: number;
  rewards?: { gold: number; experience: number; items: Array<ReturnType<typeof ItemView.render> & { quantity: 1 }> };
};
@Injectable()
export class MonstersService {
  constructor(
    private prisma: PrismaService,
    private monsterGenerator: MonsterGeneratorService,
    private usersService: UsersService,
    private itemGenerator: ItemGeneratorService,
  ) {}

  private readonly encounterChance = 0.5;
  private readonly battles = new Map<string, Battle>();

  findAll() {
    return this.prisma.monster.findMany({
      orderBy: { id: 'asc' },
    });
  }

  async findOne(id: number) {
    const monster = await this.prisma.monster.findUnique({ where: { id } });
    if (!monster) throw new NotFoundException(`Monster with id ${id} not found`);
    return monster;
  }

  async rollEncounter(userId: number) {
    if (Math.random() >= this.encounterChance) {
      return { encountered: false as const, chance: this.encounterChance };
    }

    const user = await this.usersService.findCurrentUser(userId);
    if (!user?.gameProfile) throw new NotFoundException('Game profile not found');
    const player = UserView.renderCurrent(user);
    const monster = this.monsterGenerator.generate(player.level);

    const battle = this.createBattle(userId, player, monster);
    this.battles.set(battle.id, battle);
    return { encountered: true as const, chance: this.encounterChance, monster, battle: this.renderBattle(battle) };
  }

  async enterDungeon(userId: number, name: string) {
    const user = await this.usersService.findCurrentUser(userId);
    if (!user?.gameProfile) throw new NotFoundException('Game profile not found');
    requireLandmark(name, 'dungeon', user.gameProfile);
    const existing = [...this.battles.values()].find(
      (battle) => battle.userId === userId && battle.status === 'ACTIVE',
    );
    if (existing) return this.renderBattle(existing);
    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${userId})`;
      const where = { gameProfileId_dungeon: { gameProfileId: user.gameProfile!.id, dungeon: name } };
      const visit = await tx.dungeonVisit.findUnique({ where });
      if (visit && visit.nextEntryAt > new Date())
        throw new BadRequestException('Dungeon is resting. You can enter once per hour.');
      const nextEntryAt = new Date(Date.now() + 60 * 60 * 1000);
      await tx.dungeonVisit.upsert({
        where,
        create: { gameProfileId: user.gameProfile!.id, dungeon: name, nextEntryAt },
        update: { nextEntryAt },
      });
    });
    const player = UserView.renderCurrent(user);
    const monster = this.monsterGenerator.generate(player.level + 2);
    monster.name = `${name === 'EMBERDEEP' ? 'Flamebound' : 'Hollow'} Guardian — ${monster.name}`;
    const battle = this.createBattle(userId, player, monster);
    battle.dungeon = name;
    battle.monster.health *= 2;
    battle.monster.maxHealth *= 2;
    battle.monster.damage = Math.ceil(battle.monster.damage * 1.5);
    battle.monster.defense = Math.min(60, battle.monster.defense + 5);
    battle.monster.rewardGold *= 3;
    battle.monster.rewardExperience *= 3;
    this.battles.set(battle.id, battle);
    return this.renderBattle(battle);
  }

  async resetDungeon(userId: number, name: string) {
    if ([...this.battles.values()].some((battle) => battle.userId === userId && battle.status === 'ACTIVE')) {
      throw new BadRequestException('Finish the active battle first');
    }
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${userId})`;
      const profile = await tx.gameProfile.findUnique({ where: { userId } });
      if (!profile) throw new NotFoundException('Game profile not found');
      requireLandmark(name, 'dungeon', profile);
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

  async attack(userId: number, battleId: string) {
    const battle = this.battles.get(battleId);
    if (!battle || battle.userId !== userId) throw new NotFoundException('Active battle not found');
    if (battle.status !== 'ACTIVE') throw new BadRequestException('Battle has already ended');

    battle.events = [];
    while (battle.status === 'ACTIVE') {
      this.strike(battle.player, battle.monster, 'PLAYER', battle.events);
      if (battle.monster.health <= 0) {
        battle.status = 'VICTORY';
        break;
      }

      this.strike(battle.monster, battle.player, 'MONSTER', battle.events);
      if (battle.player.health <= 0) {
        battle.status = 'DEFEAT';
        break;
      }
      battle.turn++;
    }

    if (battle.status === 'VICTORY') {
      const lootRarity = battle.dungeon ? rollDungeonLootRarity() : rollMonsterLootRarity();
      battle.rewards = {
        gold: battle.monster.rewardGold,
        experience: Math.round(battle.monster.rewardExperience * (1 + battle.experienceBonusPercent / 100)),
        items: [],
      };
      const rewards = battle.rewards;
      await this.prisma.$transaction(async (tx) => {
        const profile = await tx.gameProfile.update({
          where: { userId },
          data: {
            gold: { increment: rewards.gold },
            experience: { increment: rewards.experience },
          },
          select: { id: true, level: true, experience: true },
        });
        const progression = progressionAfterExperience(profile.level, profile.experience);
        if (progression.level !== profile.level || progression.experience !== profile.experience) {
          await tx.gameProfile.update({
            where: { id: profile.id },
            data: {
              level: progression.level,
              experience: progression.experience,
              freeAttributes: { increment: progression.freeAttributes },
            },
          });
        }
        if (!lootRarity) return;

        const item = await this.itemGenerator.generate({ level: battle.monster.level, rarity: lootRarity }, tx);
        await tx.inventoryItem.create({
          data: {
            gameProfileId: profile.id,
            itemId: item.id,
            quantity: 1,
            slot: null,
            isEquiped: false,
          },
        });
        rewards.items.push({ ...ItemView.render(item), quantity: 1 });
      });
    }

    this.battles.delete(battleId);
    return this.renderBattle(battle);
  }

  retreat(userId: number, battleId: string) {
    const battle = this.battles.get(battleId);
    if (!battle || battle.userId !== userId) throw new NotFoundException('Active battle not found');
    this.battles.delete(battleId);
    return { success: true };
  }

  private createBattle(
    userId: number,
    player: ReturnType<typeof UserView.renderCurrent>,
    monster: GeneratedMonster,
  ): Battle {
    const attribute = (name: string) => monster.attributes.find((entry) => entry.attribute.name === name)?.value ?? 0;
    const property = (name: StatType) => player.properties.find((entry) => entry.name === name)?.value ?? 0;
    const playerHealth = Math.max(1, property(StatType.HEALTH));
    const monsterHealth = 40 + monster.level * 15 + attribute('ENDURANCE') * 10;
    return {
      id: randomUUID(),
      userId,
      status: 'ACTIVE',
      turn: 1,
      events: [],
      experienceBonusPercent: player.activeBuffs.find(({ type }) => type === PlayerBuffType.EXPERIENCE)?.value ?? 0,
      player: {
        name: player.name ?? 'Player',
        health: playerHealth,
        maxHealth: playerHealth,
        damage: Math.max(1, property(StatType.DAMAGE)),
        defense: property(StatType.DEFENSE),
        dodge: property(StatType.DODGE),
        criticalChance: property(StatType.CRIT),
        criticalDamage: property(StatType.CRIT_DAMAGE),
      },
      monster: {
        id: monster.id,
        name: monster.name,
        level: monster.level,
        health: monsterHealth,
        maxHealth: monsterHealth,
        damage: 3 + monster.level * 2 + attribute('STRENGTH'),
        defense: Math.min(45, monster.level * 0.8 + attribute('ENDURANCE')),
        dodge: Math.min(30, monster.level * 0.3 + attribute('AGILITY')),
        criticalChance: Math.min(25, 3 + monster.level * 0.2),
        criticalDamage: 140,
        rewardGold: monster.rewardGold,
        rewardExperience: monster.rewardExperience,
      },
    };
  }

  private strike(attacker: Combatant, defender: Combatant, actor: 'PLAYER' | 'MONSTER', events: Battle['events']) {
    if (Math.random() * 100 < defender.dodge) {
      events.push({ actor, damage: 0, critical: false, dodged: true });
      return;
    }
    const critical = Math.random() * 100 < attacker.criticalChance;
    const attackDamage = attacker.damage * (critical ? attacker.criticalDamage / 100 : 1);
    const damage = Math.max(1, Math.round(attackDamage * (1 - defender.defense / 100)));
    defender.health = Math.max(0, defender.health - damage);
    events.push({ actor, damage, critical, dodged: false });
  }

  private renderBattle(battle: Battle) {
    return {
      id: battle.id,
      status: battle.status,
      turn: battle.turn,
      player: battle.player,
      monster: battle.monster,
      events: battle.events,
      rewards: battle.rewards,
    };
  }
}
