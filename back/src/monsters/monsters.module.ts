import { Module } from '@nestjs/common';
import { MonstersService } from './monsters.service';
import { MonstersController } from './monsters.controller';
import { PrismaService } from '../prisma.service';
import { MonsterGeneratorService } from './monster-generator.service';
import { UsersModule } from '../users/users.module';
import { ItemsModule } from '../items/items.module';

@Module({
  imports: [UsersModule, ItemsModule],
  controllers: [MonstersController],
  providers: [MonstersService, MonsterGeneratorService, PrismaService],
  exports: [MonstersService],
})
export class MonstersModule {}
