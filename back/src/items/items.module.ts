import { Module } from '@nestjs/common';
import { ItemGeneratorService } from './item-generator.service';
import { PrismaService } from '../prisma.service';

@Module({
  providers: [PrismaService, ItemGeneratorService],
  exports: [ItemGeneratorService],
})
export class ItemsModule {}
