import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class MonstersService {
  constructor(private prisma: PrismaService) {}

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
}
