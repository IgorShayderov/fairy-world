import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { ChatRetentionService } from './chat-retention.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [ChatController],
  providers: [ChatGateway, ChatRetentionService, ChatService, PrismaService],
  exports: [ChatService],
})
export class ChatModule {}
