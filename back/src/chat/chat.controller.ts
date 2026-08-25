import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { IsString, IsNotEmpty } from 'class-validator';

import { ChatService } from './chat.service';

export class CreateMessageDto {
  @IsString()
  @IsNotEmpty()
  channelId!: string;

  @IsString()
  @IsNotEmpty()
  text!: string;
}

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('messages')
  async createMessage(@Body() body: CreateMessageDto) {
    const message = await this.chatService.createMessage(body.channelId, body.text);

    return message;
  }

  @Get('channels')
  async getChannels() {
    return this.chatService.getChannels();
  }

  @Get('channels/:id/messages')
  async getMessages(@Param('id') channelId: string) {
    return this.chatService.getMessages(channelId);
  }
}
