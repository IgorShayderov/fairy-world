import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ClansController } from './clans.controller';
import { ClansService } from './clans.service';

@Module({
  controllers: [ClansController],
  providers: [ClansService, PrismaService],
  exports: [ClansService],
})
export class ClansModule {}
