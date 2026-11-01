import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma } from '../../generated/client';
import { requireLandmark } from './landmarks';

export const BLACKSMITH_REMOVAL_COST = 1000;
export const BLACKSMITH_REMOVAL_GEM_COST = 10;

@Injectable()
export class LocationsService {
  constructor(private prisma: PrismaService) {}

  async blacksmith(userId: number) {
    const profile = await this.prisma.gameProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Game profile not found');
    requireLandmark('BLACKSMITH', 'blacksmith', profile);
    const items = await this.prisma.inventoryItem.findMany({
      where: {
        gameProfileId: profile.id,
        upgradeType: { not: null },
        quantity: 1,
        item: { isConsumable: false },
        OR: [{ isEquiped: true }, { slot: null }],
      },
      include: { item: true },
      orderBy: { id: 'asc' },
    });
    return {
      cost: BLACKSMITH_REMOVAL_COST,
      gemCost: BLACKSMITH_REMOVAL_GEM_COST,
      gold: profile.gold,
      gems: profile.gems,
      items: items.map((entry) => ({
        id: entry.id,
        name: entry.item.name,
        level: entry.item.level,
        rarity: entry.item.rarity,
        upgradeType: entry.upgradeType,
        upgradeValue: entry.upgradeValue,
        equipped: entry.isEquiped,
      })),
    };
  }

  removeItemBonus(userId: number, inventoryItemId: number, expectedCost: number, expectedGemCost: number) {
    return this.prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(${userId})`;
        const profile = await tx.gameProfile.findUnique({
          where: { userId },
          include: { dungeonRun: true, dungeonParty: { include: { party: true } } },
        });
        if (!profile) throw new NotFoundException('Game profile not found');
        requireLandmark('BLACKSMITH', 'blacksmith', profile);
        if (profile.dungeonRun || profile.dungeonParty?.party.status === 'ACTIVE')
          throw new BadRequestException('Leave the dungeon before using the blacksmith');
        if (expectedCost !== BLACKSMITH_REMOVAL_COST || expectedGemCost !== BLACKSMITH_REMOVAL_GEM_COST)
          throw new BadRequestException('The price changed. Reopen the blacksmith.');
        const target = await tx.inventoryItem.findFirst({
          where: {
            id: inventoryItemId,
            gameProfileId: profile.id,
            quantity: 1,
            upgradeType: { not: null },
            item: { isConsumable: false },
            OR: [{ isEquiped: true }, { slot: null }],
          },
        });
        if (!target) throw new BadRequestException('Choose an owned equipment item with an applied bonus');
        const charged = await tx.gameProfile.updateMany({
          where: { id: profile.id, gold: { gte: BLACKSMITH_REMOVAL_COST }, gems: { gte: BLACKSMITH_REMOVAL_GEM_COST } },
          data: { gold: { decrement: BLACKSMITH_REMOVAL_COST }, gems: { decrement: BLACKSMITH_REMOVAL_GEM_COST } },
        });
        if (charged.count !== 1) throw new BadRequestException('Not enough gold or gems');
        await tx.inventoryItem.update({ where: { id: target.id }, data: { upgradeType: null, upgradeValue: null } });
        return { success: true, cost: BLACKSMITH_REMOVAL_COST, gemCost: BLACKSMITH_REMOVAL_GEM_COST };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async bless(userId: number, sanctuaryId: number, coordinates: { x: number; y: number }) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${userId})`;
      const profile = await tx.gameProfile.findUnique({ where: { userId } });
      if (!profile) throw new NotFoundException('Game profile not found');
      const sanctuary = await tx.sanctuary.findUnique({ where: { id: sanctuaryId } });
      if (!sanctuary) throw new NotFoundException('Sanctuary not found');
      const distance = Math.hypot(coordinates.x - sanctuary.x, coordinates.y - sanctuary.y);
      const savedDistance = Math.hypot(profile.mapPositionX - sanctuary.x, profile.mapPositionY - sanctuary.y);
      if (!Number.isFinite(distance) || !Number.isFinite(savedDistance) || distance > 70 || savedDistance > 70) {
        throw new BadRequestException('Travel to this landmark first');
      }
      const blessing = { type: sanctuary.buffType, value: sanctuary.buffValue };
      const visitKey = { gameProfileId_sanctuaryId: { gameProfileId: profile.id, sanctuaryId } };
      const visit = await tx.sanctuaryVisit.findUnique({ where: visitKey });
      if (visit && visit.nextBlessingAt > new Date()) {
        throw new BadRequestException('This sanctuary grants a blessing only once every four hours');
      }
      const existing = await tx.gameProfileBuff.findUnique({
        where: { gameProfileId_type: { gameProfileId: profile.id, type: blessing.type } },
      });
      // A blessing never replaces a stronger potion or stacks with another blessing.
      if (existing && existing.expiresAt > new Date()) return existing;
      await tx.sanctuaryVisit.upsert({
        where: visitKey,
        create: { gameProfileId: profile.id, sanctuaryId, nextBlessingAt: new Date(Date.now() + 4 * 60 * 60 * 1000) },
        update: { nextBlessingAt: new Date(Date.now() + 4 * 60 * 60 * 1000) },
      });
      const expiresAt = new Date(Date.now() + sanctuary.durationMinutes * 60 * 1000);
      return tx.gameProfileBuff.upsert({
        where: { gameProfileId_type: { gameProfileId: profile.id, type: blessing.type } },
        create: { gameProfileId: profile.id, ...blessing, expiresAt },
        update: { value: blessing.value, expiresAt },
      });
    });
  }

  findAll() {
    return this.prisma.location.findMany({
      orderBy: { id: 'asc' },
    });
  }

  async getUserLocation(userId: number) {
    return this.prisma.usersLocation.findUnique({
      where: { userId },
      include: { location: true },
    });
  }

  async setUserLocation(userId: number, locationId: number) {
    const location = await this.prisma.location.findUnique({ where: { id: locationId } });
    if (!location) throw new Error('Location not found');

    return this.prisma.usersLocation.upsert({
      where: { userId },
      update: { locationId },
      create: { userId, locationId },
      include: { location: true },
    });
  }
}
