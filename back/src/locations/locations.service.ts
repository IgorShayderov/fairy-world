import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class LocationsService {
  constructor(private prisma: PrismaService) {}

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
