import { Injectable, NotFoundException } from '@nestjs/common';
import { requireLandmark } from './landmarks';
import { PrismaService } from '../prisma.service';
import { PlayerBuffType } from '../../generated/client';

@Injectable()
export class LocationsService {
  constructor(private prisma: PrismaService) {}

  async bless(userId: number, name: string) {
    return this.prisma.$transaction(async (tx) => {
      const profile = await tx.gameProfile.findUnique({ where: { userId } });
      if (!profile) throw new NotFoundException('Game profile not found');
      requireLandmark(name, 'sanctum', profile);
      const blessing =
        name === 'STARGLEN'
          ? { type: PlayerBuffType.DEFENSE, value: 10 }
          : { type: PlayerBuffType.EXPERIENCE, value: 20 };
      const existing = await tx.gameProfileBuff.findUnique({
        where: { gameProfileId_type: { gameProfileId: profile.id, type: blessing.type } },
      });
      // A blessing never replaces a stronger potion or stacks with another blessing.
      if (existing && existing.expiresAt > new Date()) return existing;
      const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000);
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
