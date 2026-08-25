import { Injectable } from '@nestjs/common';

import { ChatGateway } from './chat.gateway';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly chatGateway: ChatGateway,
  ) {}

  async getChannels() {
    return this.prisma.channel.findMany({
      orderBy: { createdAt: 'asc' },
    });
  }

  async getMessages(channelId: string) {
    return this.prisma.message.findMany({
      where: { channelId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createMessage(channelId: string, text: string) {
    const savedMessage = await this.prisma.message.create({
      data: {
        channelId,
        text,
      },
    });

    this.chatGateway.server.emit('new_message', savedMessage);

    return savedMessage;
  }
}
