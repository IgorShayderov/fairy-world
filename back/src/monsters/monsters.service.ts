import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma.service';

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
  id: string;
  userId: number;
  status: BattleStatus;
  turn: number;
  player: Combatant;
  monster: Combatant & { id: number; level: number; rewardGold: number; rewardExperience: number };
  events: Array<{ actor: 'PLAYER' | 'MONSTER'; damage: number; critical: boolean; dodged: boolean }>;
  rewards?: { gold: number; experience: number };
};
type EncounterMonster = {
  id: number;
  name: string;
  level: number;
  rewardGold: number;
  rewardExperience: number;
  attributes: Array<{ value: number; attribute: { name: string } }>;
};

@Injectable()
export class MonstersService {
  constructor(private prisma: PrismaService) {}

  private readonly encounterChance = 0.05;
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

    const [profile, monsters] = await Promise.all([
      this.prisma.gameProfile.findUnique({ where: { userId }, select: { level: true } }),
      this.prisma.monster.findMany({
        include: { attributes: { include: { attribute: true } } },
        orderBy: { level: 'asc' },
      }),
    ]);
    if (!profile) throw new NotFoundException('Game profile not found');
    if (monsters.length === 0) return { encountered: false as const, chance: this.encounterChance };

    const closestDistance = Math.min(...monsters.map((monster) => Math.abs(monster.level - profile.level)));
    const suitableMonsters = monsters.filter(
      (monster) => Math.abs(monster.level - profile.level) <= closestDistance + 1,
    );
    const monster = suitableMonsters[Math.floor(Math.random() * suitableMonsters.length)];

    const battle = this.createBattle(userId, profile.level, monster);
    this.battles.set(battle.id, battle);
    return { encountered: true as const, chance: this.encounterChance, monster, battle: this.renderBattle(battle) };
  }

  async attack(userId: number, battleId: string) {
    const battle = this.battles.get(battleId);
    if (!battle || battle.userId !== userId) throw new NotFoundException('Active battle not found');
    if (battle.status !== 'ACTIVE') throw new BadRequestException('Battle has already ended');

    battle.events = [];
    this.strike(battle.player, battle.monster, 'PLAYER', battle.events);
    if (battle.monster.health <= 0) {
      battle.status = 'VICTORY';
      battle.rewards = { gold: battle.monster.rewardGold, experience: battle.monster.rewardExperience };
      await this.prisma.gameProfile.update({
        where: { userId },
        data: {
          gold: { increment: battle.rewards.gold },
          experience: { increment: battle.rewards.experience },
        },
      });
      this.battles.delete(battleId);
      return this.renderBattle(battle);
    }

    this.strike(battle.monster, battle.player, 'MONSTER', battle.events);
    battle.turn++;
    if (battle.player.health <= 0) {
      battle.status = 'DEFEAT';
      this.battles.delete(battleId);
    }
    return this.renderBattle(battle);
  }

  retreat(userId: number, battleId: string) {
    const battle = this.battles.get(battleId);
    if (!battle || battle.userId !== userId) throw new NotFoundException('Active battle not found');
    this.battles.delete(battleId);
    return { success: true };
  }

  private createBattle(userId: number, playerLevel: number, monster: EncounterMonster): Battle {
    const attribute = (name: string) => monster.attributes.find((entry) => entry.attribute.name === name)?.value ?? 0;
    const monsterHealth = 40 + monster.level * 15 + attribute('ENDURANCE') * 10;
    return {
      id: randomUUID(),
      userId,
      status: 'ACTIVE',
      turn: 1,
      events: [],
      player: {
        name: 'Player',
        health: 50 + playerLevel * 10,
        maxHealth: 50 + playerLevel * 10,
        damage: 4 + playerLevel * 3,
        defense: Math.min(50, 8 + playerLevel * 0.25),
        dodge: Math.min(35, 5 + playerLevel * 0.15),
        criticalChance: Math.min(35, 5 + playerLevel * 0.15),
        criticalDamage: 150,
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
