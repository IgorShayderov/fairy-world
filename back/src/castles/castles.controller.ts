import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import type { RequestWithUser } from '../auth/interfaces/request-with-user.interface';
import { CastlesService } from './castles.service';
import { CastleBuildingDto, CastleRaidDto, CastleSiteDto, CastleTrainingDto, CreateCastleDto } from './castles.dto';
import { castleSite } from './castle-terrain';

@ApiTags('Castles')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('castles')
export class CastlesController {
  constructor(private readonly castles: CastlesService) {}
  @Get('me') get(@Req() req: RequestWithUser) {
    return this.castles.get(req.user.sub);
  }
  @Get('leaderboard') leaderboard(@Req() req: RequestWithUser) {
    return this.castles.leaderboard(req.user.sub);
  }
  @Get('opponents/:id') preview(@Req() req: RequestWithUser, @Param('id') id: string) {
    return this.castles.preview(req.user.sub, id);
  }
  @Post('site') site(@Body() dto: CastleSiteDto) {
    return castleSite(dto.x, dto.y);
  }
  @Post() create(@Req() req: RequestWithUser, @Body() dto: CreateCastleDto) {
    return this.castles.create(req.user.sub, dto);
  }
  @Post('upgrade') upgrade(@Req() req: RequestWithUser, @Body() dto: CastleBuildingDto) {
    return this.castles.upgrade(req.user.sub, dto.building);
  }
  @Post('train') train(@Req() req: RequestWithUser, @Body() dto: CastleTrainingDto) {
    return this.castles.train(req.user.sub, dto.unit, dto.count);
  }
  @Post('mine') mine(@Req() req: RequestWithUser) {
    return this.castles.startMining(req.user.sub);
  }
  @Post('mine/collect') collect(@Req() req: RequestWithUser) {
    return this.castles.collectGem(req.user.sub);
  }
  @Post('raid') raid(@Req() req: RequestWithUser, @Body() dto: CastleRaidDto) {
    return this.castles.raid(req.user.sub, dto);
  }
}
