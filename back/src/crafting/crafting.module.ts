import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CraftingController } from './crafting.controller';
import { CraftingService } from './crafting.service';

@Module({
  controllers: [CraftingController],
  providers: [CraftingService, PrismaService],
  exports: [CraftingService],
})
export class CraftingModule {}
