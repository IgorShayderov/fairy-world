import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma.service';
import { GeneratedMonster, MonsterGeneratorService } from './monster-generator.service';
import { UsersService } from '../users/users.service';
import { UserView } from '../users/user.view';
import { ItemRarity, PlayerBuffType, StatType } from '../../generated/client';
import { ItemGeneratorService } from '../items/item-generator.service';
import { ItemView } from '../common/views/item.view';
import { rollMonsterLootRarity, rollQuestLootRarity } from './monster-loot';
import { progressionAfterExperience } from '../users/level-progression';
import { recordQuestVictory } from '../quests/quest-progress';
import { canRetreatAt, encounterChanceAt } from '../locations/map-terrain';
import type { UpdateMapPositionDto } from '../users/dto/update-map-position.dto';
import { CRAFTING_MIN_LEVEL, rollCraftMaterialCode } from '../crafting/crafting.catalog';
import { rollDeathCurse } from './death-curse';
import { DungeonRunsService } from './dungeon-runs.service';

export { DEATH_CURSES, rollDeathCurse } from './death-curse';

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
  startedAt: Date;
  monsterType: string;
  id: string;
  userId: number;
  status: BattleStatus;
  turn: number;
  player: Combatant;
  monster: Combatant & { id: number; level: number; rewardGold: number; rewardExperience: number };
  events: Array<{ actor: 'PLAYER' | 'MONSTER'; damage: number; critical: boolean; dodged: boolean }>;
  experienceBonusPercent: number;
  goldBonusPercent: number;
  canRetreat: boolean;
  rewards?: {
    gold: number;
    experience: number;
    items: Array<
      ReturnType<typeof ItemView.render> & {
        quantity: 1;
        inventoryItemId?: number;
        addedToInventory?: boolean;
        inventoryFull?: boolean;
      }
    >;
    craftItems: Array<{
      id: number;
      name: string;
      description: string;
      icon: string;
      rarity: ItemRarity;
      quantity: number;
    }>;
  };
};
@Injectable()
export class MonstersService {
  constructor(
    private prisma: PrismaService,
    private monsterGenerator: MonsterGeneratorService,
    private usersService: UsersService,
    private itemGenerator: ItemGeneratorService,
    private dungeonRuns: DungeonRunsService,
  ) {}

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
    const user = await this.usersService.findCurrentUser(userId);
    if (!user?.gameProfile) throw new NotFoundException('Game profile not found');
    const point = { x: user.gameProfile.mapPositionX, y: user.gameProfile.mapPositionY };
    const chance = encounterChanceAt(point);
    if (Math.random() >= chance) return { encountered: false as const, chance };
    const player = UserView.renderCurrent(user);
    const monster = this.monsterGenerator.generate(player.level, {
      x: user.gameProfile.mapPositionX,
      y: user.gameProfile.mapPositionY,
    });

    const battle = this.createBattle(userId, player, monster, canRetreatAt(point));
    this.battles.set(battle.id, battle);
    return { encountered: true as const, chance, monster, battle: this.renderBattle(battle) };
  }

  async updateMapPositionAndRollEncounter(userId: number, position: UpdateMapPositionDto) {
    const user = await this.usersService.findCurrentUser(userId);
    if (!user?.gameProfile) throw new NotFoundException('Game profile not found');
    const distance = Math.hypot(position.x - user.gameProfile.mapPositionX, position.y - user.gameProfile.mapPositionY);
    if (distance > 200) {
      throw new BadRequestException('Map position changed too far in one travel update');
    }
    await this.usersService.updateMapPosition(userId, position);
    const chance = encounterChanceAt(position);
    return {
      position: { x: position.x, y: position.y },
      encounter: distance < 60 ? { encountered: false as const, chance } : await this.rollEncounter(userId),
    };
  }

  async enterDungeon(userId: number, name: string) {
    return this.dungeonRuns.enter(userId, name);
  }

  dungeonParties(userId: number, name: string) {
    return this.dungeonRuns.partyLobby(userId, name);
  }

  createDungeonParty(userId: number, name: string) {
    return this.dungeonRuns.createParty(userId, name);
  }

  joinDungeonParty(userId: number, partyId: string) {
    return this.dungeonRuns.joinParty(userId, partyId);
  }

  leaveDungeonParty(userId: number, partyId: string) {
    return this.dungeonRuns.leaveParty(userId, partyId);
  }

  startDungeonParty(userId: number, partyId: string) {
    return this.dungeonRuns.startParty(userId, partyId);
  }

  activeDungeon(userId: number) {
    return this.dungeonRuns.active(userId);
  }

  attackDungeonOpponent(userId: number, runId: string, opponentId: string) {
    return this.dungeonRuns.attack(userId, runId, opponentId);
  }

  leaveDungeon(userId: number, runId: string) {
    return this.dungeonRuns.leave(userId, runId);
  }

  useDungeonHealthPotion(userId: number, runId: string, inventoryItemId: number) {
    return this.dungeonRuns.useHealthPotion(userId, runId, inventoryItemId);
  }

  submitDungeonPartyLoot(userId: number, runId: string, itemIds: unknown) {
    return this.dungeonRuns.submitPartyLoot(userId, runId, itemIds);
  }

  async resetDungeon(userId: number, name: string) {
    if ([...this.battles.values()].some((battle) => battle.userId === userId && battle.status === 'ACTIVE')) {
      throw new BadRequestException('Finish the active battle first');
    }
    return this.dungeonRuns.reset(userId, name);
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
      const lootRarity = rollMonsterLootRarity();
      battle.rewards = {
        gold: Math.round(battle.monster.rewardGold * (1 + battle.goldBonusPercent / 100)),
        experience: Math.round(battle.monster.rewardExperience * (1 + battle.experienceBonusPercent / 100)),
        items: [],
        craftItems: [],
      };
      const rewards = battle.rewards;
      await this.prisma.$transaction(async (tx) => {
        const profile = await tx.gameProfile.update({
          where: { userId },
          data: {
            gold: { increment: rewards.gold },
            experience: { increment: rewards.experience },
            killedMonsters: { increment: 1 },
          },
          select: { id: true, level: true, experience: true },
        });
        const finished = await recordQuestVictory(tx, profile.id, battle.monsterType, battle.startedAt);
        const questGold = finished.reduce((sum, quest) => sum + quest.rewardGold, 0);
        const questExperience = finished.reduce((sum, quest) => sum + quest.rewardExperience, 0);
        if (finished.length) {
          await tx.gameProfile.update({
            where: { id: profile.id },
            data: { gold: { increment: questGold }, experience: { increment: questExperience } },
          });
          rewards.gold += questGold;
          rewards.experience += questExperience;
        }
        const progression = progressionAfterExperience(profile.level, profile.experience + questExperience);
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
        const currentBackpackCount = await tx.inventoryItem.count({
          where: { gameProfileId: profile.id, isEquiped: false },
        });
        let availableSlots = Math.max(0, 24 - currentBackpackCount);
        const drops = [
          lootRarity,
          ...finished.filter((quest) => !quest.destinationTownId).map(() => rollQuestLootRarity()),
        ];
        for (const [index, rarity] of drops.entries()) {
          if (!rarity) continue;
          const item = await this.itemGenerator.generate(
            { level: battle.monster.level, rarity, ...(index > 0 ? { minimumRarity: ItemRarity.MAGIC } : {}) },
            tx,
          );
          if (availableSlots > 0) {
            const created = await tx.inventoryItem.create({
              data: {
                gameProfileId: profile.id,
                itemId: item.id,
                quantity: 1,
                slot: null,
                isEquiped: false,
              },
            });
            availableSlots--;
            rewards.items.push({
              ...ItemView.render(item),
              quantity: 1,
              inventoryItemId: created?.id,
              addedToInventory: true,
              inventoryFull: false,
            });
          } else {
            rewards.items.push({
              ...ItemView.render(item),
              quantity: 1,
              addedToInventory: false,
              inventoryFull: true,
            });
          }
        }
        const materialCode = profile.level >= CRAFTING_MIN_LEVEL ? rollCraftMaterialCode() : null;
        if (materialCode) {
          const material = await tx.craftItem.findUnique({ where: { code: materialCode } });
          if (material) {
            await tx.playerCraftItem.upsert({
              where: { gameProfileId_craftItemId: { gameProfileId: profile.id, craftItemId: material.id } },
              create: { gameProfileId: profile.id, craftItemId: material.id, quantity: 1 },
              update: { quantity: { increment: 1 } },
            });
            rewards.craftItems.push({
              id: material.id,
              name: material.name,
              description: material.description,
              icon: material.icon,
              rarity: material.rarity,
              quantity: 1,
            });
          }
        }
      });
    }

    if (battle.status === 'DEFEAT') {
      await this.prisma.$transaction(async (tx) => {
        const profile = await tx.gameProfile.update({
          where: { userId },
          data: { mapPositionX: 1470, mapPositionY: 960 },
        });
        await tx.gameProfileBuff.deleteMany({ where: { gameProfileId: profile.id } });
        const curse = rollDeathCurse(profile.level);
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
      });
      for (const [id, other] of this.battles) if (other.userId === userId) this.battles.delete(id);
    }

    this.battles.delete(battleId);
    return this.renderBattle(battle);
  }

  retreat(userId: number, battleId: string) {
    const battle = this.battles.get(battleId);
    if (!battle || battle.userId !== userId) throw new NotFoundException('Active battle not found');
    if (!battle.canRetreat) throw new BadRequestException('You can retreat only on a road or near a town');
    this.battles.delete(battleId);
    return { success: true };
  }

  private createBattle(
    userId: number,
    player: ReturnType<typeof UserView.renderCurrent>,
    monster: GeneratedMonster,
    canRetreat: boolean,
  ): Battle {
    const attribute = (name: string) => monster.attributes.find((entry) => entry.attribute.name === name)?.value ?? 0;
    const property = (name: StatType) => player.properties.find((entry) => entry.name === name)?.value ?? 0;
    const playerHealth = Math.max(1, property(StatType.HEALTH));
    const monsterHealth = 40 + monster.level * 15 + attribute('ENDURANCE') * 10;
    return {
      id: randomUUID(),
      startedAt: new Date(),
      monsterType: monster.monsterType,
      userId,
      status: 'ACTIVE',
      turn: 1,
      events: [],
      experienceBonusPercent:
        (player.activeBuffs.find(({ type }) => type === PlayerBuffType.EXPERIENCE)?.value ?? 0) +
        player.rewardBonuses.experiencePercent,
      goldBonusPercent: player.rewardBonuses.goldPercent,
      canRetreat,
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
      canRetreat: battle.canRetreat,
    };
  }
}
