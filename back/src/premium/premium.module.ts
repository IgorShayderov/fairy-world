import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { PremiumService } from './premium.service';
import { PremiumController } from './premium.controller';
import { QuickBattleGuard } from './quick-battle.guard';

@Module({
  controllers: [PremiumController],
  providers: [PrismaService, PremiumService, QuickBattleGuard],
  exports: [PremiumService, QuickBattleGuard],
})
export class PremiumModule {}
