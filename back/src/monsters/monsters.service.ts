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
import { canHuntAt, canRetreatAt, encounterChanceAt } from '../locations/map-terrain';
import type { UpdateMapPositionDto } from '../users/dto/update-map-position.dto';
import { CRAFTING_MIN_LEVEL, rollCraftMaterialCode } from '../crafting/crafting.catalog';
import { rollDeathCurse } from './death-curse';
import { DungeonRunsService } from './dungeon-runs.service';
import { monsterMovement } from './battle-movement';
import { canShoot } from './battle-range';
import { SKILLS, type SkillDefinition, type SkillEffect } from '../skills/skills.catalog';
import { magicSkillManaCost } from '../items/mage-equipment';

export { DEATH_CURSES, rollDeathCurse } from './death-curse';

type BattleStatus = 'ACTIVE' | 'VICTORY' | 'DEFEAT';
export type BattleAction = 'ATTACK' | 'DEFEND' | 'POWER_ATTACK' | 'MOVE' | 'SKILL';
const ARENA_COLUMNS = 8;
const ARENA_ROWS = 5;
type Combatant = {
  missingAmmunition?: boolean;
  attackRange?: number;
  movement: number;
  name: string;
  health: number;
  maxHealth: number;
  damage: number;
  defense: number;
  dodge: number;
  blockChance: number;
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
  events: Array<{
    skillId?: string;
    skillName?: string;
    effect?: SkillEffect;
    healing?: number;
    actor: 'PLAYER' | 'MONSTER';
    damage: number;
    critical: boolean;
    dodged: boolean;
    blocked?: boolean;
    action?: BattleAction;
    fromCell?: number;
    toCell?: number;
  }>;
  powerAttackCooldown: number;
  skills?: {
    class: string | null;
    ranks: Record<string, number>;
    mana: number;
    maxMana: number;
    spellPower: number;
    manaCostReduction?: number;
    readyOnTurn: Record<string, number>;
  };
  playerPosition: number;
  monsterPosition: number;
  blockedCells: number[];
  playerMovedThisTurn: boolean;
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

  hasActiveBattle(userId: number) {
    return [...this.battles.values()].some((battle) => battle.userId === userId && battle.status === 'ACTIVE');
  }

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

  async hunt(userId: number) {
    if ([...this.battles.values()].some((battle) => battle.userId === userId && battle.status === 'ACTIVE')) {
      throw new BadRequestException('Finish the active battle first');
    }
    if (await this.dungeonRuns.active(userId)) {
      throw new BadRequestException('Finish the active dungeon first');
    }

    const user = await this.usersService.findCurrentUser(userId);
    if (!user?.gameProfile) throw new NotFoundException('Game profile not found');
    const point = { x: user.gameProfile.mapPositionX, y: user.gameProfile.mapPositionY };
    if (!canHuntAt(point)) {
      throw new BadRequestException('Hunting is available only away from roads, settlements, and sanctuaries');
    }

    const player = UserView.renderCurrent(user);
    const monster = this.monsterGenerator.generate(player.level, point);
    const battle = this.createBattle(userId, player, monster, canRetreatAt(point));
    this.battles.set(battle.id, battle);
    return { monster, battle: this.renderBattle(battle) };
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

  activeForcedBattle(userId: number) {
    const battle = [...this.battles.values()].find(
      (candidate) => candidate.userId === userId && candidate.status === 'ACTIVE' && !candidate.canRetreat,
    );
    return battle ? this.renderBattle(battle) : null;
  }

  attackDungeonOpponent(userId: number, runId: string, opponentId: string, skillId?: string) {
    return this.dungeonRuns.attack(userId, runId, opponentId, skillId);
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

  async resetDungeon(userId: number, name: string, expectedCost?: number) {
    if ([...this.battles.values()].some((battle) => battle.userId === userId && battle.status === 'ACTIVE')) {
      throw new BadRequestException('Finish the active battle first');
    }
    return this.dungeonRuns.reset(userId, name, expectedCost);
  }

  async attack(userId: number, battleId: string, preserveEvents = false) {
    const battle = this.battles.get(battleId);
    if (!battle || battle.userId !== userId) throw new NotFoundException('Active battle not found');
    if (battle.status !== 'ACTIVE') throw new BadRequestException('Battle has already ended');

    if (!preserveEvents) battle.events = [];
    while (battle.status === 'ACTIVE') {
      if (battle.monster.health <= 0) {
        battle.status = 'VICTORY';
        break;
      }
      if (battle.player.health <= 0) {
        battle.status = 'DEFEAT';
        break;
      }
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

  async takeTurn(userId: number, battleId: string, action: BattleAction, targetCell?: number, skillId?: string) {
    const battle = this.battles.get(battleId);
    if (!battle || battle.userId !== userId) throw new NotFoundException('Active battle not found');
    if (battle.status !== 'ACTIVE') throw new BadRequestException('Battle has already ended');
    // POWER_ATTACK remains an event type for old battle logs, not a free combat ability.
    if (action === 'POWER_ATTACK') {
      throw new BadRequestException('Power Strike is not a learned skill. Use a learned combat ability');
    }
    if (!['ATTACK', 'DEFEND', 'MOVE', 'SKILL'].includes(action)) {
      throw new BadRequestException('Unknown battle action');
    }
    if (action === 'MOVE' && battle.playerMovedThisTurn) {
      throw new BadRequestException('You have already moved this turn');
    }

    const canAttack = this.playerCanAttack(battle);
    const skill = action === 'SKILL' ? SKILLS.find((entry) => entry.id === skillId && entry.effect) : undefined;
    if (action === 'SKILL') {
      const error = this.skillUnavailable(battle, skill);
      if (error) throw new BadRequestException(error);
    }
    if (action === 'ATTACK' && !canAttack) {
      throw new BadRequestException(
        (battle.player.attackRange ?? 1) > 1
          ? 'Enemy is outside attack range or the shot is blocked'
          : 'Move next to the enemy before attacking',
      );
    }

    battle.events = battle.playerMovedThisTurn
      ? battle.events.filter((event) => event.actor === 'PLAYER' && event.action === 'MOVE')
      : [];
    if (action === 'MOVE') {
      if (!Number.isInteger(targetCell)) throw new BadRequestException('Choose a battlefield hex');
      const reachable = this.reachableCells(
        battle.playerPosition,
        battle.monsterPosition,
        battle.player.movement,
        battle.blockedCells,
      );
      if (!reachable.includes(targetCell!)) throw new BadRequestException('That hex is outside your movement range');
      const fromCell = battle.playerPosition;
      battle.playerPosition = targetCell!;
      battle.events.push({
        actor: 'PLAYER',
        damage: 0,
        critical: false,
        dodged: false,
        action: 'MOVE',
        fromCell,
        toCell: targetCell,
      });
      battle.playerMovedThisTurn = true;
      return this.renderBattle(battle);
    } else if (action === 'DEFEND') {
      battle.events.push({ actor: 'PLAYER', damage: 0, critical: false, dodged: false, action: 'DEFEND' });
    } else if (skill && battle.skills) {
      const state = battle.skills;
      const rank = state.ranks[skill.id];
      state.mana -= magicSkillManaCost(skill.manaCost ?? 0, skill.class, state.manaCostReduction ?? 0);
      state.readyOnTurn[skill.id] = battle.turn + (skill.cooldown ?? 0) + 1;
      if (skill.effect === 'heal') {
        const healing = Math.min(
          battle.player.maxHealth - battle.player.health,
          Math.round(battle.player.maxHealth * (0.15 + (rank - 1) * 0.01)),
        );
        battle.player.health += healing;
        battle.events.push({
          actor: 'PLAYER',
          action: 'SKILL',
          skillId: skill.id,
          skillName: skill.name,
          effect: skill.effect,
          healing,
          damage: 0,
          critical: false,
          dodged: false,
        });
      } else {
        const originalDefense = battle.monster.defense;
        if (skill.effect === 'pierce' || skill.effect === 'arcane') battle.monster.defense *= 0.5;
        this.strike(
          {
            ...battle.player,
            criticalChance: skill.canCrit ? battle.player.criticalChance : 0,
            damage:
              (skill.class === 'MAGE' ? state.spellPower : battle.player.damage) *
              ((skill.multiplier ?? 1) + (rank - 1) * 0.04),
          },
          battle.monster,
          'PLAYER',
          battle.events,
        );
        battle.monster.defense = originalDefense;
        Object.assign(battle.events[battle.events.length - 1], {
          action: 'SKILL',
          skillId: skill.id,
          skillName: skill.name,
          effect: skill.effect,
        });
      }
    } else {
      this.strike(battle.player, battle.monster, 'PLAYER', battle.events);
      battle.events[battle.events.length - 1].action = action;
    }

    if (battle.monster.health <= 0) return this.attack(userId, battleId, true);

    const originalDefense = battle.player.defense;
    if (action === 'DEFEND') battle.player.defense = Math.min(75, originalDefense + 25);
    if (!this.areAdjacent(battle.playerPosition, battle.monsterPosition)) {
      const path = this.shortestPath(
        battle.monsterPosition,
        battle.playerPosition,
        battle.playerPosition,
        battle.blockedCells,
      );
      const slowed =
        skill?.effect === 'ice' && battle.events.some((event) => event.skillId === skill.id && event.damage > 0);
      const movement = slowed ? Math.max(1, battle.monster.movement - 2) : battle.monster.movement;
      const destination = path[Math.min(movement, path.length - 1)];
      if (destination !== undefined && destination !== battle.monsterPosition) {
        const fromCell = battle.monsterPosition;
        battle.monsterPosition = destination;
        battle.events.push({
          actor: 'MONSTER',
          damage: 0,
          critical: false,
          dodged: false,
          action: 'MOVE',
          fromCell,
          toCell: destination,
        });
      }
    }
    if (this.areAdjacent(battle.playerPosition, battle.monsterPosition)) {
      this.strike(battle.monster, battle.player, 'MONSTER', battle.events);
    }
    battle.player.defense = originalDefense;

    if (battle.player.health <= 0) return this.attack(userId, battleId, true);

    battle.playerMovedThisTurn = false;
    battle.turn++;
    if (battle.skills) battle.skills.mana = Math.min(battle.skills.maxMana, battle.skills.mana + 3);
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
      powerAttackCooldown: 0,
      skills: {
        class: player.skills?.class ?? null,
        ranks: { ...player.skills?.ranks },
        mana: property(StatType.MANA),
        maxMana: property(StatType.MANA),
        spellPower: player.spellPower ?? 10,
        manaCostReduction: player.manaCostReduction ?? 0,
        readyOnTurn: {},
      },
      playerPosition: ARENA_COLUMNS * 2,
      monsterPosition: ARENA_COLUMNS * 2 + ARENA_COLUMNS - 1,
      blockedCells: [10, 29],
      playerMovedThisTurn: false,
      experienceBonusPercent:
        (player.activeBuffs.find(({ type }) => type === PlayerBuffType.EXPERIENCE)?.value ?? 0) +
        player.rewardBonuses.experiencePercent,
      goldBonusPercent: player.rewardBonuses.goldPercent,
      canRetreat,
      player: {
        attackRange: player.attackRange,
        missingAmmunition: player.missingAmmunition,
        movement: player.properties.find((entry) => entry.name === 'MOVEMENT')?.value ?? 3,
        name: player.name ?? 'Player',
        health: playerHealth,
        maxHealth: playerHealth,
        damage: Math.max(1, property(StatType.DAMAGE)),
        defense: property(StatType.DEFENSE),
        dodge: property(StatType.DODGE),
        blockChance: player.blockChance,
        criticalChance: property(StatType.CRIT),
        criticalDamage: property(StatType.CRIT_DAMAGE),
      },
      monster: {
        movement: monsterMovement(monster.monsterType),
        id: monster.id,
        name: monster.name,
        level: monster.level,
        health: monsterHealth,
        maxHealth: monsterHealth,
        damage: 3 + monster.level * 2 + attribute('STRENGTH'),
        defense: Math.min(45, monster.level * 0.8 + attribute('ENDURANCE')),
        dodge: Math.min(30, monster.level * 0.3 + attribute('AGILITY')),
        blockChance: 0,
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
    if (defender.blockChance > 0 && Math.random() * 100 < defender.blockChance) {
      events.push({ actor, damage: 0, critical: false, dodged: false, blocked: true });
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
      monsterType: battle.monsterType,
      status: battle.status,
      turn: battle.turn,
      player: battle.player,
      monster: battle.monster,
      events: battle.events,
      rewards: battle.rewards,
      canRetreat: battle.canRetreat,
      powerAttackCooldown: battle.powerAttackCooldown,
      skills: battle.skills
        ? {
            mana: battle.skills.mana,
            maxMana: battle.skills.maxMana,
            abilities: SKILLS.filter((skill) => skill.effect && battle.skills!.ranks[skill.id] > 0).map((skill) => ({
              ...skill,
              manaCost: magicSkillManaCost(skill.manaCost ?? 0, skill.class, battle.skills!.manaCostReduction ?? 0),
              rank: battle.skills!.ranks[skill.id],
              remainingCooldown: Math.max(0, (battle.skills!.readyOnTurn[skill.id] ?? 0) - battle.turn),
              unavailable: this.skillUnavailable(battle, skill),
            })),
          }
        : undefined,
      arena: {
        columns: ARENA_COLUMNS,
        rows: ARENA_ROWS,
        playerPosition: battle.playerPosition,
        monsterPosition: battle.monsterPosition,
        playerMovement: battle.player.movement,
        monsterMovement: battle.monster.movement,
        blockedCells: battle.blockedCells,
        reachableCells:
          battle.status === 'ACTIVE' && !battle.playerMovedThisTurn
            ? this.reachableCells(
                battle.playerPosition,
                battle.monsterPosition,
                battle.player.movement,
                battle.blockedCells,
              )
            : [],
        canAttack: battle.status === 'ACTIVE' && this.playerCanAttack(battle),
        playerAttackRange: battle.player.attackRange ?? 1,
        playerHasMoved: battle.playerMovedThisTurn,
      },
    };
  }

  private playerCanAttack(battle: Battle) {
    const range = battle.player.attackRange ?? 1;
    return range > 1
      ? canShoot(battle.playerPosition, battle.monsterPosition, ARENA_COLUMNS, range, battle.blockedCells)
      : this.areAdjacent(battle.playerPosition, battle.monsterPosition);
  }

  private skillUnavailable(battle: Battle, skill: SkillDefinition | undefined): string | null {
    const state = battle.skills;
    if (!skill?.effect || !state || skill.class !== state.class || !state.ranks[skill.id])
      return 'Skill has not been learned';
    if (battle.status !== 'ACTIVE') return 'Battle has ended';
    if ((state.readyOnTurn[skill.id] ?? 0) > battle.turn) return 'Skill is on cooldown';
    if (state.mana < magicSkillManaCost(skill.manaCost ?? 0, skill.class, state.manaCostReduction ?? 0))
      return 'Not enough mana';
    if (skill.effect === 'heal')
      return battle.player.health >= battle.player.maxHealth ? 'Health is already full' : null;
    if (skill.class === 'SCOUT' && (battle.player.missingAmmunition || (battle.player.attackRange ?? 1) <= 1))
      return 'Equip a bow or crossbow and matching ammunition';
    const range = skill.range ?? battle.player.attackRange ?? 1;
    const inRange =
      range > 1
        ? canShoot(battle.playerPosition, battle.monsterPosition, ARENA_COLUMNS, range, battle.blockedCells)
        : this.areAdjacent(battle.playerPosition, battle.monsterPosition);
    return inRange ? null : 'Enemy is out of range or line of sight is blocked';
  }

  private arenaNeighbors(cell: number) {
    const row = Math.floor(cell / ARENA_COLUMNS);
    const column = cell % ARENA_COLUMNS;
    const offsets =
      row % 2 === 0
        ? [
            [-1, 0],
            [1, 0],
            [-1, -1],
            [0, -1],
            [-1, 1],
            [0, 1],
          ]
        : [
            [-1, 0],
            [1, 0],
            [0, -1],
            [1, -1],
            [0, 1],
            [1, 1],
          ];
    return offsets
      .map(([columnOffset, rowOffset]) => ({ column: column + columnOffset, row: row + rowOffset }))
      .filter(
        ({ column: nextColumn, row: nextRow }) =>
          nextColumn >= 0 && nextColumn < ARENA_COLUMNS && nextRow >= 0 && nextRow < ARENA_ROWS,
      )
      .map(({ column: nextColumn, row: nextRow }) => nextRow * ARENA_COLUMNS + nextColumn);
  }

  private areAdjacent(first: number, second: number) {
    return this.arenaNeighbors(first).includes(second);
  }

  private reachableCells(start: number, occupied: number, movement: number, blocked: number[] = []) {
    const distances = new Map<number, number>([[start, 0]]);
    const queue = [start];
    while (queue.length) {
      const current = queue.shift()!;
      const distance = distances.get(current)!;
      if (distance >= movement) continue;
      for (const next of this.arenaNeighbors(current)) {
        if (next === occupied || blocked.includes(next) || distances.has(next)) continue;
        distances.set(next, distance + 1);
        queue.push(next);
      }
    }
    return [...distances.keys()].filter((cell) => cell !== start);
  }

  private shortestPath(start: number, target: number, occupied: number, blocked: number[] = []) {
    const previous = new Map<number, number | null>([[start, null]]);
    const queue = [start];
    let destination = start;
    while (queue.length) {
      const current = queue.shift()!;
      if (this.areAdjacent(current, target)) {
        destination = current;
        break;
      }
      for (const next of this.arenaNeighbors(current)) {
        if (next === occupied || blocked.includes(next) || previous.has(next)) continue;
        previous.set(next, current);
        queue.push(next);
      }
    }
    const path = [destination];
    let current = destination;
    while (true) {
      const parent = previous.get(current);
      if (parent === null || parent === undefined) break;
      path.unshift(parent);
      current = parent;
    }
    return path;
  }
}
