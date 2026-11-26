import { ChatModule } from '../chat/chat.module';
import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuctionController, NotificationsController } from './auction.controller';
import { AuctionService } from './auction.service';

@Module({
  imports: [ChatModule],
  controllers: [AuctionController, NotificationsController],
  providers: [PrismaService, AuctionService],
})
export class AuctionModule {}
