import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class LocationsService {
  constructor(private prisma: PrismaService) {}

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
      const existing = await tx.gameProfileBuff.findUnique({
        where: { gameProfileId_type: { gameProfileId: profile.id, type: blessing.type } },
      });
      // A blessing never replaces a stronger potion or stacks with another blessing.
      if (existing && existing.expiresAt > new Date()) return existing;
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
