import { Controller, Get, Param, ParseIntPipe, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import type { RequestWithUser } from '../auth/interfaces/request-with-user.interface';
import { QuestsService } from './quests.service';

@ApiTags('quests')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('quests')
export class QuestsController {
  constructor(private readonly quests: QuestsService) {}

  @Get()
  list(@Request() req: RequestWithUser) {
    return this.quests.list(req.user.sub);
  }

  @Post(':id/accept')
  accept(@Request() req: RequestWithUser, @Param('id', ParseIntPipe) id: number) {
    return this.quests.accept(req.user.sub, id);
  }

  @Post('refresh')
  refresh(@Request() req: RequestWithUser) { return this.quests.refresh(req.user.sub); }

  @Post(':id/cancel')
  cancel(@Request() req: RequestWithUser, @Param('id', ParseIntPipe) id: number) {
    return this.quests.cancel(req.user.sub, id);
  }
}
