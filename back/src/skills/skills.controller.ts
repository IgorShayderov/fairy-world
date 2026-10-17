import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { IsIn } from 'class-validator';
import { AuthGuard } from '../auth/auth.guard';
import type { RequestWithUser } from '../auth/interfaces/request-with-user.interface';
import { PLAYER_CLASSES } from './skills.catalog';
import { SkillsService } from './skills.service';

class ChooseClassDto {
  @IsIn(PLAYER_CLASSES)
  class!: string;
}

@Controller('skills')
@UseGuards(AuthGuard)
export class SkillsController {
  constructor(private readonly skills: SkillsService) {}

  @Get()
  get(@Req() req: RequestWithUser) {
    return this.skills.get(req.user.sub);
  }

  @Post('reset')
  reset(@Req() req: RequestWithUser) {
    return this.skills.change(req.user.sub, { reset: true });
  }

  // Initial class choice is free; changing an existing class includes the paid reset.
  @Post('class')
  choose(@Req() req: RequestWithUser, @Body() dto: ChooseClassDto) {
    return this.skills.change(req.user.sub, { class: dto.class });
  }

  @Post(':skillId/upgrade')
  upgrade(@Req() req: RequestWithUser, @Param('skillId') skillId: string) {
    return this.skills.change(req.user.sub, { skillId });
  }
}
