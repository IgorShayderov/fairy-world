import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma.service';
import { GeneratedMonster, MonsterGeneratorService } from './monster-generator.service';
import { UsersService } from '../users/users.service';
import { UserView } from '../users/user.view';
import { StatType } from '../../generated/client';

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
@Injectable()
export class MonstersService {
  constructor(
    private prisma: PrismaService,
    private monsterGenerator: MonsterGeneratorService,
    private usersService: UsersService,
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
      battle.rewards = { gold: battle.monster.rewardGold, experience: battle.monster.rewardExperience };
      await this.prisma.gameProfile.update({
        where: { userId },
        data: {
          gold: { increment: battle.rewards.gold },
          experience: { increment: battle.rewards.experience },
        },
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
