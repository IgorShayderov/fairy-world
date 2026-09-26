import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import type { RequestWithUser } from '../auth/interfaces/request-with-user.interface';
import { DuelDto } from './dto/duel.dto';
import { PvpService } from './pvp.service';

@ApiTags('PvP')
@ApiBearerAuth()
@Controller('pvp')
@UseGuards(AuthGuard)
export class PvpController {
  constructor(private readonly pvpService: PvpService) {}

  @Get('opponents')
  @ApiOperation({ summary: 'Получить 3 варианта соперников для PvP' })
  @ApiResponse({ status: 200, description: 'Список из 3 соперников' })
  getOpponents(@Req() req: RequestWithUser) {
    return this.pvpService.getOpponents(req.user.sub);
  }

  @Post('opponents/refresh')
  @ApiOperation({ summary: 'Обновить список соперников для PvP за 30 самоцветов' })
  @ApiResponse({ status: 200, description: 'Новый список из 3 соперников' })
  refreshOpponents(@Req() req: RequestWithUser) {
    return this.pvpService.refreshOpponents(req.user.sub);
  }

  @Post('duel')
  @ApiOperation({ summary: 'Провести атаку на выбранного соперника' })
  @ApiResponse({ status: 200, description: 'Результат атаки с логом боя и наградами' })
  duel(@Req() req: RequestWithUser, @Body() dto: DuelDto) {
    return this.pvpService.duel(req.user.sub, dto.opponentId);
  }

  @Post('cooldown/reset')
  @ApiOperation({ summary: 'Сбросить таймер перезарядки атаки за 10 самоцветов' })
  @ApiResponse({ status: 200, description: 'Успешный сброс перезарядки' })
  resetCooldown(@Req() req: RequestWithUser) {
    return this.pvpService.resetCooldown(req.user.sub);
  }
}
