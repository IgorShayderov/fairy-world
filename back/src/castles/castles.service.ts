import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { randomInt } from 'node:crypto';
import { Castle, Prisma } from '../../generated/client';
import { PrismaService } from '../prisma.service';
import { CastleRaidDto, CreateCastleDto } from './castles.dto';
import { castleSite, uncrowdedCastleSite, CASTLE_CITIES, CASTLE_CITY_RADIUS, CASTLE_CLEARANCE } from './castle-terrain';
import {
  accrue,
  armyCapacity,
  armyPower,
  armySize,
  BUILDINGS,
  buildingKeys,
  CASTLE_MIN_LEVEL,
  FOUNDATION_GOLD,
  isBuilding,
  isUnit,
  MAX_BUILDING_LEVEL,
  production,
  RAID_COOLDOWN_MS,
  raidResult,
  RAID_SECONDS,
  storageCapacity,
  UNITS,
  unitKeys,
  upgradeCost,
  NEW_CASTLE_PROTECTION_MS,
  DEFEAT_PROTECTION_MS,
  MAX_KEEP_DIFFERENCE,
  defensePower,
  raidLoot,
  requiredKeep,
  miningCost,
} from './castle-rules';

@Injectable()
export class CastlesService {
  private readonly logger = new Logger(CastlesService.name);
  constructor(private readonly prisma: PrismaService) {}

  private buildingCost(building: Parameters<typeof upgradeCost>[0], level: number) {
    const cost = upgradeCost(building, level);
    return { ...cost, seconds: process.env.NODE_ENV === 'development' ? 0 : cost.seconds };
  }

  private async withOwner<T>(
    userId: number,
    work: (
      tx: Prisma.TransactionClient,
      profile: { id: number; level: number; gold: number },
      castle: Castle | null,
      now: Date,
    ) => Promise<T>,
  ) {
    await this.settleDueFor(userId);
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${userId})`;
      const profile = await tx.gameProfile.findUnique({
        where: { userId },
        select: { id: true, level: true, gold: true },
      });
      if (!profile) throw new NotFoundException('Game profile not found');
      const now = new Date();
      const castle = await tx.castle.findUnique({ where: { profileId: profile.id } });
      if (castle) {
        const clearSite = uncrowdedCastleSite(castle);
        if (clearSite) Object.assign(castle, clearSite);
        await this.settleGrowth(tx, castle, now);
      }
      return work(tx, profile, castle, now);
    });
  }

  /** Split offline production at upgrades; never apply the new rate retroactively. */
  private async settleGrowth(tx: Prisma.TransactionClient, castle: Castle, now: Date) {
    const events = [
      {
        kind: 'build',
        at:
          process.env.NODE_ENV === 'development' && castle.constructionEndsAt && castle.constructionEndsAt > now
            ? now
            : castle.constructionEndsAt,
      },
      { kind: 'training', at: castle.trainingEndsAt },
    ]
      .filter((e) => e.at && e.at <= now)
      .sort((a, b) => a.at!.getTime() - b.at!.getTime());
    for (const event of events) {
      accrue(castle, event.at!);
      if (event.kind === 'build' && castle.construction && isBuilding(castle.construction)) {
        castle[castle.construction]++;
        castle.rating += castle[castle.construction] * 25;
        castle.construction = null;
        castle.constructionEndsAt = null;
      } else if (event.kind === 'training' && castle.training && isUnit(castle.training)) {
        castle[castle.training] += castle.trainingCount;
        castle.training = null;
        castle.trainingCount = 0;
        castle.trainingEndsAt = null;
      }
    }
    accrue(castle, now);
    await this.save(tx, castle);
  }

  private save(tx: Prisma.TransactionClient, castle: Castle) {
    const { id, profileId, createdAt, ...data } = castle;
    void profileId;
    void createdAt;
    return tx.castle.update({ where: { id }, data });
  }
  private requireCastle(castle: Castle | null): asserts castle is Castle {
    if (!castle) throw new BadRequestException('Build your castle first');
  }

  async get(userId: number) {
    return this.withOwner(userId, async (tx, profile, castle, now) => ({
      serverTime: now,
      eligible: profile.level >= CASTLE_MIN_LEVEL,
      minLevel: CASTLE_MIN_LEVEL,
      foundationGold: FOUNDATION_GOLD,
      gold: profile.gold,
      placement: {
        cities: CASTLE_CITIES.map(({ name, x, y }) => ({ name, x, y })),
        radius: CASTLE_CITY_RADIUS,
        clearance: CASTLE_CLEARANCE,
      },
      castle: castle
        ? {
            ...castle,
            wood: Math.floor(castle.wood),
            stone: Math.floor(castle.stone),
            capacity: storageCapacity(castle),
            production: production(castle),
            armyCapacity: armyCapacity(castle.barracks),
            armyPower: armyPower(castle, castle.forge),
            defensePower: defensePower(castle),
            miningCost: miningCost(castle.gemMine),
            equipmentGems: await tx.equipmentGem.findMany({
              where: { gameProfileId: profile.id },
              orderBy: { createdAt: 'desc' },
            }),
            buildings: buildingKeys.map((key) => ({
              key,
              ...BUILDINGS[key],
              level: castle[key],
              nextCost: castle[key] < MAX_BUILDING_LEVEL ? this.buildingCost(key, castle[key] + 1) : null,
              requiredKeep: requiredKeep(key),
              unlocked: castle.keep >= requiredKeep(key) && (key === 'keep' || castle[key] < castle.keep),
            })),
            units: unitKeys.map((key) => ({ key, ...UNITS[key], count: castle[key] })),
            reports: await tx.castleReport.findMany({
              where: { castleId: castle.id },
              orderBy: { createdAt: 'desc' },
              take: 30,
            }),
          }
        : null,
    }));
  }

  create(userId: number, dto: CreateCastleDto) {
    return this.withOwner(userId, async (tx, profile, castle, now) => {
      if (castle) throw new BadRequestException('You already own a castle');
      if (profile.level < CASTLE_MIN_LEVEL) throw new BadRequestException('Castles unlock at level 25');
      const site = castleSite(dto.x, dto.y);
      if (!site.valid) throw new BadRequestException(site.reason);
      if (dto.name.trim().length < 3 || dto.name.trim().length > 40)
        throw new BadRequestException('Use a castle name of 3–40 characters');
      const charged = await tx.gameProfile.updateMany({
        where: { id: profile.id, gold: { gte: FOUNDATION_GOLD } },
        data: { gold: { decrement: FOUNDATION_GOLD } },
      });
      if (charged.count !== 1) throw new BadRequestException('Not enough gold to found a castle');
      await tx.castle.create({
        data: {
          profileId: profile.id,
          name: dto.name.trim(),
          x: dto.x,
          y: dto.y,
          city: site.city!,
          // A renewable source of both resources prevents an early spending soft-lock.
          lumberMill: 1,
          quarry: 1,
          protectedUntil: new Date(now.getTime() + NEW_CASTLE_PROTECTION_MS),
        },
      });
      return { success: true };
    });
  }

  async upgrade(userId: number, building: string) {
    if (!isBuilding(building)) throw new BadRequestException('Unknown building');
    return this.withOwner(userId, async (tx, _profile, castle, now) => {
      this.requireCastle(castle);
      if (castle.construction) throw new BadRequestException('Your builders are already working');
      if (castle[building] >= MAX_BUILDING_LEVEL) throw new BadRequestException('Maximum building level reached');
      if (castle.keep < requiredKeep(building))
        throw new BadRequestException(`Requires Crownkeep level ${requiredKeep(building)}`);
      if (building !== 'keep' && castle[building] >= castle.keep)
        throw new BadRequestException('Upgrade Crownkeep first');
      const cost = this.buildingCost(building, castle[building] + 1);
      if (castle.wood < cost.wood || castle.stone < cost.stone)
        throw new BadRequestException('Not enough wood or stone');
      castle.wood -= cost.wood;
      castle.stone -= cost.stone;
      castle.construction = building;
      castle.constructionEndsAt = new Date(now.getTime() + cost.seconds * 1000);
      await this.settleGrowth(tx, castle, now);
      return { success: true };
    });
  }

  startMining(userId: number) {
    return this.withOwner(userId, async (tx, profile, castle, now) => {
      this.requireCastle(castle);
      if (castle.keep < 5 || castle.gemMine < 1)
        throw new BadRequestException('Build the Gem Mine after Crownkeep level 5');
      if (castle.miningEndsAt) throw new BadRequestException('Collect the current expedition before starting another');
      if ((await tx.equipmentGem.count({ where: { gameProfileId: profile.id } })) >= 100)
        throw new BadRequestException('Gem storage is full (100). Insert some gems before mining again');
      const cost = miningCost(castle.gemMine);
      if (castle.wood < cost.wood || castle.stone < cost.stone)
        throw new BadRequestException('Not enough wood or stone');
      castle.wood -= cost.wood;
      castle.stone -= cost.stone;
      castle.miningLevel = castle.gemMine;
      castle.miningEndsAt = new Date(now.getTime() + cost.seconds * 1000);
      await this.save(tx, castle);
      return { success: true };
    });
  }

  collectGem(userId: number) {
    return this.withOwner(userId, async (tx, profile, castle, now) => {
      this.requireCastle(castle);
      if (!castle.miningEndsAt || castle.miningEndsAt > now)
        throw new BadRequestException('The mining expedition is not complete');
      const type = (['DAMAGE', 'DEFENSE', 'HEALTH'] as const)[randomInt(3)];
      const value = (castle.miningLevel * 2 + randomInt(2, 6)) * (type === 'HEALTH' ? 5 : 1);
      const gem = await tx.equipmentGem.create({
        data: { gameProfileId: profile.id, type, value, mineLevel: castle.miningLevel },
      });
      castle.miningEndsAt = null;
      castle.miningLevel = 0;
      await this.save(tx, castle);
      return gem;
    });
  }

  async train(userId: number, unit: string, count: number) {
    if (!isUnit(unit) || !Number.isInteger(count) || count < 1 || count > 100)
      throw new BadRequestException('Invalid training order');
    return this.withOwner(userId, async (tx, _profile, castle, now) => {
      this.requireCastle(castle);
      if (castle.training) throw new BadRequestException('A training order is already in progress');
      const definition = UNITS[unit];
      if (castle.barracks < definition.barracks)
        throw new BadRequestException('Upgrade the barracks to unlock this unit');
      const deployed = castle.raidSentinels + castle.raidRangers + castle.raidArcanists;
      if (armySize(castle) + deployed + count > armyCapacity(castle.barracks))
        throw new BadRequestException('Not enough army capacity');
      if (castle.wood < definition.wood * count || castle.stone < definition.stone * count)
        throw new BadRequestException('Not enough wood or stone');
      castle.wood -= definition.wood * count;
      castle.stone -= definition.stone * count;
      castle.training = unit;
      castle.trainingCount = count;
      castle.trainingEndsAt = new Date(now.getTime() + definition.seconds * count * 1000);
      await this.save(tx, castle);
      return { success: true };
    });
  }

  private opponentReason(attacker: Castle, defender: Castle, now: Date) {
    if (attacker.id === defender.id) return 'You cannot attack your own castle';
    if (defender.protectedUntil && defender.protectedUntil > now) return 'This castle is protected';
    if (Math.abs(attacker.keep - defender.keep) > MAX_KEEP_DIFFERENCE)
      return 'Choose a castle within 2 Crownkeep levels of your own';
    return null;
  }

  async preview(userId: number, targetId: string) {
    return this.withOwner(userId, async (tx, _profile, castle, now) => {
      this.requireCastle(castle);
      const target = await tx.castle.findUnique({
        where: { id: targetId },
        include: { profile: { select: { user: { select: { name: true } } } } },
      });
      if (!target) throw new NotFoundException('Castle not found');
      const projected = { ...target };
      accrue(projected, now);
      const cap = storageCapacity(castle);
      return {
        id: target.id,
        name: target.name,
        owner: target.profile.user.name,
        keep: target.keep,
        defense: defensePower(target),
        ...raidLoot(projected, { wood: cap - castle.wood, stone: cap - castle.stone }),
        seconds: RAID_SECONDS,
        rating: 20 + target.keep * 5,
        reason: this.opponentReason(castle, target, now),
        protectedUntil: target.protectedUntil,
      };
    });
  }

  async raid(userId: number, dto: CastleRaidDto) {
    if (unitKeys.some((key) => !Number.isInteger(dto[key]) || dto[key] < 0 || dto[key] > 200) || armySize(dto) < 1)
      throw new BadRequestException('Choose at least one available unit');
    return this.withOwner(userId, async (tx, _profile, castle, now) => {
      this.requireCastle(castle);
      if (castle.raidTarget) throw new BadRequestException('Your army is already on a raid');
      if (castle.raidCooldownUntil && castle.raidCooldownUntil > now)
        throw new BadRequestException('Your army must rest before another raid');
      const target = await tx.castle.findUnique({ where: { id: dto.target } });
      if (!target) throw new NotFoundException('Castle not found');
      const reason = this.opponentReason(castle, target, now);
      if (reason) throw new BadRequestException(reason);
      if (unitKeys.some((key) => dto[key] > castle[key])) throw new BadRequestException('Not enough available troops');
      for (const key of unitKeys) castle[key] -= dto[key];
      castle.raidTarget = target.id;
      castle.raidSentinels = dto.sentinels;
      castle.raidRangers = dto.rangers;
      castle.raidArcanists = dto.arcanists;
      castle.raidPower = armyPower(dto, castle.forge);
      castle.protectedUntil = null;
      castle.raidEndsAt = new Date(now.getTime() + RAID_SECONDS * 1000);
      castle.raidCooldownUntil = new Date(castle.raidEndsAt.getTime() + RAID_COOLDOWN_MS);
      await this.save(tx, castle);
      return { success: true };
    });
  }

  /** Resolve incoming and outgoing raids before an owner spends or collects resources. */
  private async settleDueFor(userId: number) {
    const own = await this.prisma.castle.findFirst({ where: { profile: { userId } }, select: { id: true } });
    if (!own) return;
    const due = await this.prisma.castle.findMany({
      where: { raidEndsAt: { lte: new Date() }, OR: [{ id: own.id }, { raidTarget: own.id }] },
      select: { id: true },
      orderBy: [{ raidEndsAt: 'asc' }, { id: 'asc' }],
    });
    for (const raid of due) await this.resolveRaid(raid.id);
  }

  @Cron('*/15 * * * * *', { waitForCompletion: true })
  async resolveRaids() {
    const due = await this.prisma.castle.findMany({
      where: { raidEndsAt: { lte: new Date() } },
      select: { id: true },
      orderBy: [{ raidEndsAt: 'asc' }, { id: 'asc' }],
      take: 100,
    });
    for (const raid of due) {
      try {
        await this.resolveRaid(raid.id);
      } catch {
        this.logger.warn(`Castle raid ${raid.id} will be retried`);
      }
    }
  }

  async resolveRaid(attackerId: string) {
    const initial = await this.prisma.castle.findUnique({
      where: { id: attackerId },
      include: { profile: { select: { userId: true } } },
    });
    if (!initial?.raidTarget || !initial.raidEndsAt || initial.raidEndsAt > new Date()) return;
    const opponent = await this.prisma.castle.findUnique({
      where: { id: initial.raidTarget },
      include: { profile: { select: { userId: true } } },
    });
    return this.prisma.$transaction(
      async (tx) => {
        // Canonical lock order prevents deadlocks during simultaneous counter-attacks.
        const users = [...new Set([initial.profile.userId, ...(opponent ? [opponent.profile.userId] : [])])].sort(
          (a, b) => a - b,
        );
        for (const id of users) await tx.$executeRaw`SELECT pg_advisory_xact_lock(${id})`;
        const now = new Date();
        const attacker = await tx.castle.findUnique({ where: { id: attackerId } });
        if (
          !attacker?.raidTarget ||
          attacker.raidTarget !== initial.raidTarget ||
          !attacker.raidEndsAt ||
          attacker.raidEndsAt > now
        )
          return;
        const defender = await tx.castle.findUnique({ where: { id: attacker.raidTarget } });
        await this.settleGrowth(tx, attacker, now);
        if (defender) await this.settleGrowth(tx, defender, now);
        const army = {
          sentinels: attacker.raidSentinels,
          rangers: attacker.raidRangers,
          arcanists: attacker.raidArcanists,
        };
        const cancelled = !defender || !!(defender.protectedUntil && defender.protectedUntil > now);
        const result = cancelled
          ? { victory: false, losses: { sentinels: 0, rangers: 0, arcanists: 0 } }
          : raidResult(attacker.raidPower, defensePower(defender), army);
        const cap = storageCapacity(attacker);
        const loot =
          result.victory && defender
            ? raidLoot(defender, { wood: cap - attacker.wood, stone: cap - attacker.stone })
            : { wood: 0, stone: 0 };
        attacker.wood += loot.wood;
        attacker.stone += loot.stone;
        for (const key of unitKeys) attacker[key] += army[key] - result.losses[key];
        if (result.victory && defender) {
          attacker.victories++;
          attacker.rating += 20 + defender.keep * 5;
          defender.protectedUntil = new Date(now.getTime() + DEFEAT_PROTECTION_MS);
        }
        if (defender && !cancelled) {
          defender.wood -= loot.wood;
          defender.stone -= loot.stone;
          const losses = { sentinels: 0, rangers: 0, arcanists: 0 };
          for (const key of unitKeys) {
            losses[key] = Math.ceil(defender[key] * (result.victory ? 0.3 : 0.1));
            defender[key] -= losses[key];
          }
          await tx.castleReport.create({
            data: {
              castleId: defender.id,
              target: attacker.name,
              kind: 'DEFENSE',
              victory: !result.victory,
              wood: loot.wood,
              stone: loot.stone,
              lostSentinels: losses.sentinels,
              lostRangers: losses.rangers,
              lostArcanists: losses.arcanists,
            },
          });
          await this.save(tx, defender);
        }
        await tx.castleReport.create({
          data: {
            castleId: attacker.id,
            target: defender?.name ?? 'Former castle',
            kind: cancelled ? 'RETURN' : 'ATTACK',
            victory: result.victory,
            wood: loot.wood,
            stone: loot.stone,
            lostSentinels: result.losses.sentinels,
            lostRangers: result.losses.rangers,
            lostArcanists: result.losses.arcanists,
          },
        });
        attacker.raidTarget = null;
        attacker.raidEndsAt = null;
        attacker.raidSentinels = attacker.raidRangers = attacker.raidArcanists = attacker.raidPower = 0;
        await this.save(tx, attacker);
      },
      { timeout: 15000 },
    );
  }

  async leaderboard(userId: number) {
    const castles = await this.prisma.castle.findMany({
      take: 100,
      orderBy: [{ rating: 'desc' }, { victories: 'desc' }, { createdAt: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        name: true,
        keep: true,
        rating: true,
        victories: true,
        protectedUntil: true,
        profile: { select: { userId: true, user: { select: { name: true } } } },
      },
    });
    return castles.map((castle, index) => ({
      rank: index + 1,
      id: castle.id,
      name: castle.name,
      owner: castle.profile.user.name,
      keep: castle.keep,
      rating: castle.rating,
      victories: castle.victories,
      isCurrent: castle.profile.userId === userId,
      protectedUntil: castle.protectedUntil,
    }));
  }
}
