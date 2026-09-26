import { BadRequestException, Injectable, NotFoundException, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { CraftItemKind, StatType } from '../../generated/client';
import { PrismaService } from '../prisma.service';
import { UsersService } from '../users/users.service';
import { UserView } from '../users/user.view';
import { progressionAfterExperience } from '../users/level-progression';
import type { PvpBattleEvent, PvpCombatant, PvpDifficulty, PvpDuelResult, PvpOpponent } from './pvp.types';

const BOT_NAMES = [
  'Valerius',
  'Kaelen',
  'Aurelia',
  'Doran',
  'Lyra',
  'Garrick',
  'Thalia',
  'Zephyr',
  'Rowan',
  'Cassian',
  'Morrigan',
  'Elora',
  'Vaelin',
  'Brant',
  'Sylas',
  'Fenric',
  'Gareth',
  'Alden',
  'Theron',
  'Vespera',
  'Soren',
  'Darian',
  'Bryn',
  'Kael',
];

const BOT_TITLES = [
  'Ironclad',
  'Shadowblade',
  'Stormcaller',
  'the Swift',
  'Spellweaver',
  'Bloodfang',
  'the Valiant',
  'the Fearless',
  'Flameheart',
  'the Unbroken',
  'Runeaxe',
  'the Silent',
  'Nightstalker',
  'the Resolute',
  'Dawnseeker',
  'Duskwarden',
];

export const PVP_REFRESH_GEMS_COST = 30;
export const PVP_RESET_COOLDOWN_GEMS_COST = 10;
export const PVP_ATTACK_COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes

type CachedOpponents = {
  opponents: PvpOpponent[];
  dayKey: string;
  generatedAt: number;
};

@Injectable()
export class PvpService implements OnModuleInit, OnModuleDestroy {
  private dailyResetTimer?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  // Cache user's current 3 opponents in memory
  private readonly userOpponents = new Map<number, CachedOpponents>();

  onModuleInit() {
    // Check every 30 minutes to clean up stale days
    this.dailyResetTimer = setInterval(
      () => {
        this.clearStaleDayCache();
      },
      30 * 60 * 1000,
    );
    this.dailyResetTimer.unref();
  }

  onModuleDestroy() {
    if (this.dailyResetTimer) clearInterval(this.dailyResetTimer);
  }

  clearStaleDayCache(now = new Date()) {
    const currentDay = now.toISOString().slice(0, 10);
    for (const [userId, cached] of this.userOpponents.entries()) {
      if (cached.dayKey !== currentDay) {
        this.userOpponents.delete(userId);
      }
    }
  }

  async getOpponents(userId: number): Promise<PvpOpponent[]> {
    const currentDayKey = new Date().toISOString().slice(0, 10);
    const cached = this.userOpponents.get(userId);

    // Opponents stay valid for the same day unless refreshed or replaced
    if (cached && cached.dayKey === currentDayKey && cached.opponents.length === 3) {
      return cached.opponents;
    }

    return this.generateOpponents(userId);
  }

  async refreshOpponents(userId: number): Promise<PvpOpponent[]> {
    const user = await this.usersService.findCurrentUser(userId);
    if (!user?.gameProfile) throw new NotFoundException('Game profile not found');

    if (user.gameProfile.gems < PVP_REFRESH_GEMS_COST) {
      throw new BadRequestException('Not enough gems to refresh opponents');
    }

    await this.prisma.gameProfile.update({
      where: { id: user.gameProfile.id },
      data: { gems: { decrement: PVP_REFRESH_GEMS_COST } },
    });

    return this.generateOpponents(userId);
  }

  getUserOpponents(userId: number): PvpOpponent[] | undefined {
    return this.userOpponents.get(userId)?.opponents;
  }

  setCachedDayKey(userId: number, dayKey: string): void {
    const s = this.userOpponents.get(userId);
    if (s) s.dayKey = dayKey;
  }

  async resetCooldown(userId: number): Promise<{ success: boolean; pvpCooldownUntil: null }> {
    const user = await this.usersService.findCurrentUser(userId);
    if (!user?.gameProfile) throw new NotFoundException('Game profile not found');

    if (user.gameProfile.gems < PVP_RESET_COOLDOWN_GEMS_COST) {
      throw new BadRequestException('Not enough gems to reset attack timer');
    }

    await this.prisma.gameProfile.update({
      where: { id: user.gameProfile.id },
      data: {
        gems: { decrement: PVP_RESET_COOLDOWN_GEMS_COST },
        pvpCooldownUntil: null,
      },
    });

    return { success: true, pvpCooldownUntil: null };
  }

  async generateOpponents(userId: number): Promise<PvpOpponent[]> {
    const user = await this.usersService.findCurrentUser(userId);
    if (!user?.gameProfile) throw new NotFoundException('Game profile not found');

    const player = UserView.renderCurrent(user);
    const playerLevel = player.level;

    // Real players eligible from [playerLevel - 2, playerLevel + 3]
    const minRealLevel = Math.max(1, playerLevel - 2);
    const maxRealLevel = Math.min(100, playerLevel + 3);

    const realCandidates = await this.prisma.user.findMany({
      where: {
        id: { not: userId },
        gameProfile: { level: { gte: minRealLevel, lte: maxRealLevel } },
      },
      include: {
        gameProfile: {
          include: {
            inventory: {
              include: {
                item: {
                  include: {
                    attributes: { include: { attribute: true } },
                    stats: { include: { stat: true } },
                  },
                },
              },
            },
            profileAttributes: { include: { attribute: true } },
            profileStats: { include: { stat: true } },
            buffs: true,
            dungeonVisits: true,
            sanctuaryVisits: true,
            craftItems: {
              where: { quantity: { gt: 0 }, craftItem: { kind: CraftItemKind.MATERIAL } },
              include: { craftItem: true },
            },
            dungeonRun: { select: { id: true } },
            dungeonParty: { select: { party: { select: { status: true } } } },
            _count: { select: { quests: { where: { completedAt: { not: null } } } } },
          },
        },
      },
    });

    const shuffledReal = [...realCandidates].sort(() => Math.random() - 0.5);
    const opponents: PvpOpponent[] = [];

    const availableNames = [...BOT_NAMES].sort(() => Math.random() - 0.5);
    const availableTitles = [...BOT_TITLES].sort(() => Math.random() - 0.5);

    for (let i = 0; i < 3; i++) {
      if (shuffledReal.length > 0) {
        const candidate = shuffledReal.pop()!;
        opponents.push(this.createRealPlayerOpponent(candidate, playerLevel));
      } else {
        const botName = `${availableNames[i % availableNames.length]} ${availableTitles[i % availableTitles.length]}`;
        // Random bot level: minimum is same level, from this to +5
        const botLevel = Math.min(100, playerLevel + Math.floor(Math.random() * 6));
        opponents.push(this.createBotOpponent(botName, botLevel, playerLevel));
      }
    }

    const currentDayKey = new Date().toISOString().slice(0, 10);
    this.userOpponents.set(userId, {
      opponents,
      dayKey: currentDayKey,
      generatedAt: Date.now(),
    });

    return opponents;
  }

  async generateSingleOpponent(
    currentUser: NonNullable<Awaited<ReturnType<UsersService['findCurrentUser']>>>,
    existingOpponents: PvpOpponent[],
  ): Promise<PvpOpponent> {
    const player = UserView.renderCurrent(currentUser);
    const playerLevel = player.level;
    const existingIds = new Set(existingOpponents.map((o) => o.id));

    // Try finding an unused real player in range
    const minRealLevel = Math.max(1, playerLevel - 2);
    const maxRealLevel = Math.min(100, playerLevel + 3);

    const candidates = await this.prisma.user.findMany({
      where: {
        id: { not: currentUser.id },
        gameProfile: { level: { gte: minRealLevel, lte: maxRealLevel } },
      },
      include: {
        gameProfile: {
          include: {
            inventory: {
              include: {
                item: {
                  include: {
                    attributes: { include: { attribute: true } },
                    stats: { include: { stat: true } },
                  },
                },
              },
            },
            profileAttributes: { include: { attribute: true } },
            profileStats: { include: { stat: true } },
            buffs: true,
            dungeonVisits: true,
            sanctuaryVisits: true,
            craftItems: {
              where: { quantity: { gt: 0 }, craftItem: { kind: CraftItemKind.MATERIAL } },
              include: { craftItem: true },
            },
            dungeonRun: { select: { id: true } },
            dungeonParty: { select: { party: { select: { status: true } } } },
            _count: { select: { quests: { where: { completedAt: { not: null } } } } },
          },
        },
      },
    });

    const unusedReal = candidates.filter((c) => !existingIds.has(`opp-real-${c.id}`));
    if (unusedReal.length > 0) {
      const selected = unusedReal[Math.floor(Math.random() * unusedReal.length)];
      return this.createRealPlayerOpponent(selected, playerLevel);
    }

    // Otherwise generate a random bot in [playerLevel, playerLevel + 5]
    const existingNames = new Set(existingOpponents.map((o) => o.name));
    const candidateNames = BOT_NAMES.filter((n) => !existingNames.has(n));
    const nameBase = candidateNames[Math.floor(Math.random() * candidateNames.length)] ?? BOT_NAMES[0];
    const title = BOT_TITLES[Math.floor(Math.random() * BOT_TITLES.length)];
    const botName = `${nameBase} ${title}`;
    const botLevel = Math.min(100, playerLevel + Math.floor(Math.random() * 6));

    return this.createBotOpponent(botName, botLevel, playerLevel);
  }

  private createRealPlayerOpponent(
    candidate: Parameters<typeof UserView.renderCurrent>[0],
    playerLevel: number,
  ): PvpOpponent {
    const candidateRendered = UserView.renderCurrent(candidate);
    const prop = (name: StatType) => candidateRendered.properties.find((p) => p.name === name)?.value ?? 0;

    const health = Math.max(1, Math.round(prop(StatType.HEALTH)));
    const damage = Math.max(1, Math.round(prop(StatType.DAMAGE)));
    const defense = Math.max(0, Math.round(prop(StatType.DEFENSE)));
    const dodge = Math.max(0, Math.round(prop(StatType.DODGE)));
    const crit = Math.max(0, Math.round(prop(StatType.CRIT)));
    const critDamage = Math.max(100, Math.round(prop(StatType.CRIT_DAMAGE) || 150));
    const targetLevel = candidateRendered.level;

    const difficulty: PvpDifficulty =
      targetLevel < playerLevel ? 'EASY' : targetLevel === playerLevel ? 'MEDIUM' : 'HARD';

    // 0 gold reward, EXP reduced by 50%
    const reducedExp = Math.max(5, Math.round(35 * (1 + targetLevel * 0.6) * 0.5));

    return {
      id: `opp-real-${candidate.id}-${randomUUID()}`,
      name: candidateRendered.name ?? 'Challenger',
      level: targetLevel,
      difficulty,
      isBot: false,
      health,
      maxHealth: health,
      damage,
      defense,
      dodge,
      criticalChance: crit,
      criticalDamage: critDamage,
      rewards: {
        gold: 0,
        experience: reducedExp,
      },
    };
  }

  private createBotOpponent(botName: string, targetLevel: number, playerLevel: number): PvpOpponent {
    const difficulty: PvpDifficulty =
      targetLevel < playerLevel ? 'EASY' : targetLevel === playerLevel ? 'MEDIUM' : 'HARD';

    const mult = difficulty === 'EASY' ? 0.85 : difficulty === 'MEDIUM' ? 1.0 : 1.15;
    const botHealth = Math.round((55 + targetLevel * 16) * mult);
    const botDamage = Math.max(1, Math.round((7 + targetLevel * 3.2) * mult));
    const botDefense = Math.min(50, Math.max(0, Math.round((5 + targetLevel * 1.2) * mult)));
    const botDodge = Math.min(30, Math.max(0, Math.round((4 + targetLevel * 0.35) * mult)));
    const botCrit = Math.min(35, Math.max(0, Math.round((5 + targetLevel * 0.4) * mult)));

    // 0 gold reward, EXP reduced by 50%
    const reducedExp = Math.max(5, Math.round(35 * (1 + targetLevel * 0.6) * 0.5));

    return {
      id: `opp-bot-${randomUUID()}`,
      name: botName,
      level: targetLevel,
      difficulty,
      isBot: true,
      health: botHealth,
      maxHealth: botHealth,
      damage: botDamage,
      defense: botDefense,
      dodge: botDodge,
      criticalChance: botCrit,
      criticalDamage: 150,
      rewards: {
        gold: 0,
        experience: reducedExp,
      },
    };
  }

  async duel(userId: number, opponentId: string): Promise<PvpDuelResult> {
    const cached = this.userOpponents.get(userId);
    const opponent = cached?.opponents.find((o) => o.id === opponentId);
    if (!opponent) {
      throw new NotFoundException('Selected opponent not found. Please refresh the opponents list.');
    }

    const user = await this.usersService.findCurrentUser(userId);
    if (!user?.gameProfile) throw new NotFoundException('Game profile not found');

    // Check attack cooldown
    if (user.gameProfile.pvpCooldownUntil && user.gameProfile.pvpCooldownUntil.getTime() > Date.now()) {
      const remainingMinutes = Math.ceil((user.gameProfile.pvpCooldownUntil.getTime() - Date.now()) / (60 * 1000));
      throw new BadRequestException(
        `Attack is on cooldown for ${remainingMinutes} more minute(s). Wait or reset for 10 gems.`,
      );
    }

    const player = UserView.renderCurrent(user);
    const property = (name: StatType) => player.properties.find((entry) => entry.name === name)?.value ?? 0;

    const playerHealth = Math.max(1, Math.round(property(StatType.HEALTH)));
    const playerCombatant: PvpCombatant = {
      name: player.name ?? 'Player',
      level: player.level,
      health: playerHealth,
      maxHealth: playerHealth,
      damage: Math.max(1, Math.round(property(StatType.DAMAGE))),
      defense: Math.round(property(StatType.DEFENSE)),
      dodge: Math.round(property(StatType.DODGE)),
      criticalChance: Math.round(property(StatType.CRIT)),
      criticalDamage: Math.round(property(StatType.CRIT_DAMAGE) || 150),
    };

    const opponentCombatant: PvpCombatant = {
      name: opponent.name,
      level: opponent.level,
      health: opponent.health,
      maxHealth: opponent.maxHealth,
      damage: opponent.damage,
      defense: opponent.defense,
      dodge: opponent.dodge,
      criticalChance: opponent.criticalChance,
      criticalDamage: opponent.criticalDamage,
    };

    const events: PvpBattleEvent[] = [];
    let turn = 1;
    let status: 'VICTORY' | 'DEFEAT' = 'DEFEAT';

    while (turn <= 50) {
      // 1. Player strikes opponent
      this.strike(playerCombatant, opponentCombatant, 'PLAYER', events);
      if (opponentCombatant.health <= 0) {
        status = 'VICTORY';
        break;
      }

      // 2. Opponent strikes player
      this.strike(opponentCombatant, playerCombatant, 'OPPONENT', events);
      if (playerCombatant.health <= 0) {
        status = 'DEFEAT';
        break;
      }

      turn += 1;
    }

    if (status === 'VICTORY') {
      const profile = user.gameProfile;
      const progression = progressionAfterExperience(profile.level, profile.experience + opponent.rewards.experience);
      const cooldownUntil = new Date(Date.now() + PVP_ATTACK_COOLDOWN_MS);

      await this.prisma.$transaction(async (tx) => {
        await tx.gameProfile.update({
          where: { id: profile.id },
          data: {
            coinsOfHonour: { increment: 1 },
            pvpCooldownUntil: cooldownUntil,
            experience: progression.experience,
            level: progression.level,
            freeAttributes: { increment: progression.freeAttributes },
          },
        });
      });

      // Position of character who lost stands another
      if (cached) {
        const defeatedIndex = cached.opponents.findIndex((o) => o.id === opponentId);
        if (defeatedIndex !== -1) {
          const replacement = await this.generateSingleOpponent(user, cached.opponents);
          cached.opponents[defeatedIndex] = replacement;
        }
      }

      return {
        id: randomUUID(),
        status: 'VICTORY',
        turn,
        difficulty: opponent.difficulty,
        player: playerCombatant,
        opponent: opponentCombatant,
        events,
        cooldownUntil: cooldownUntil.toISOString(),
        rewards: {
          gold: 0,
          experience: opponent.rewards.experience,
          coinsOfHonour: 1,
        },
      };
    }

    return {
      id: randomUUID(),
      status: 'DEFEAT',
      turn,
      difficulty: opponent.difficulty,
      player: playerCombatant,
      opponent: opponentCombatant,
      events,
      rewards: null,
    };
  }

  private strike(
    attacker: PvpCombatant,
    defender: PvpCombatant,
    actor: 'PLAYER' | 'OPPONENT',
    events: PvpBattleEvent[],
  ): void {
    // Check defender dodge
    const dodgeRoll = Math.random() * 100;
    if (dodgeRoll < defender.dodge) {
      events.push({
        actor,
        damage: 0,
        critical: false,
        dodged: true,
      });
      return;
    }

    // Check critical hit
    const critRoll = Math.random() * 100;
    const isCritical = critRoll < attacker.criticalChance;
    const baseDamage = attacker.damage;
    const critMultiplier = isCritical ? attacker.criticalDamage / 100 : 1;

    // Defense mitigation (percentage defense capped at 75%)
    const defenseMitigation = Math.min(0.75, defender.defense / 100);
    const finalDamage = Math.max(1, Math.round(baseDamage * critMultiplier * (1 - defenseMitigation)));

    defender.health = Math.max(0, defender.health - finalDamage);

    events.push({
      actor,
      damage: finalDamage,
      critical: isCritical,
      dodged: false,
    });
  }
}
