import { Body, Controller, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
import { IsIn } from 'class-validator';
import { AuthGuard } from '../auth/auth.guard';
import type { RequestWithUser } from '../auth/interfaces/request-with-user.interface';
import { StoryQuestsService } from './story-quests.service';

export class StoryRewardDto {
  @IsIn(['gold', 'resources'])
  choice: string;
}

@UseGuards(AuthGuard)
@Controller('quests/stories')
export class StoryQuestsController {
  constructor(private readonly stories: StoryQuestsService) {}
  @Get()
  list(@Request() req: RequestWithUser) {
    return this.stories.list(req.user.sub);
  }
  @Post(':code/accept')
  accept(@Request() req: RequestWithUser, @Param('code') code: string) {
    return this.stories.act(req.user.sub, code, 'accept');
  }
  @Post(':code/investigate')
  investigate(@Request() req: RequestWithUser, @Param('code') code: string) {
    return this.stories.act(req.user.sub, code, 'investigate');
  }
  @Post(':code/claim')
  claim(@Request() req: RequestWithUser, @Param('code') code: string, @Body() dto: StoryRewardDto) {
    return this.stories.act(req.user.sub, code, 'claim', dto.choice);
  }
}
