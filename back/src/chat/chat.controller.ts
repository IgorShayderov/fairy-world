import { Controller, UseGuards, Get, Post, Body, Param, Request } from '@nestjs/common';
import { ApiOkResponse, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

import { ChatService } from './chat.service';
import { AuthGuard } from '../auth/auth.guard';
import type { RequestWithUser } from '../auth/interfaces/request-with-user.interface';

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
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Create message in chat' })
  async createMessage(@Request() req: RequestWithUser, @Body() body: CreateMessageDto) {
    const message = await this.chatService.createMessage(req.user.sub, body.channelId, body.text);

    return message;
  }

  @Get('channels')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'List channels' })
  async getChannels() {
    return this.chatService.getChannels();
  }

  @Get('channels/:id/messages')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'List messages of specific channel' })
  async getMessages(@Param('id') channelId: string) {
    return this.chatService.getMessages(channelId);
  }
}
