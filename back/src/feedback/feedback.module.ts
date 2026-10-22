import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AdminAuthGuard } from './admin-auth.guard';
import { AdminAuthService } from './admin-auth.service';
import { AdminAuthController, AdminFeedbackController, FeedbackController } from './feedback.controller';
import { FeedbackService } from './feedback.service';
import { AdminGemPricesController, GemPricesController } from '../gem-prices/gem-prices.controller';

@Module({
  controllers: [
    FeedbackController,
    AdminAuthController,
    AdminFeedbackController,
    AdminGemPricesController,
    GemPricesController,
  ],
  providers: [PrismaService, FeedbackService, AdminAuthService, AdminAuthGuard],
  exports: [AdminAuthGuard, AdminAuthService],
})
export class FeedbackModule {}
