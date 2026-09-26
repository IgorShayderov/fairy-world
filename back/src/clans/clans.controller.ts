import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import type { RequestWithUser } from '../auth/interfaces/request-with-user.interface';
import { ClansService } from './clans.service';
import { CreateClanDto } from './dto/create-clan.dto';
import { UpdateClanRoleDto } from './dto/update-clan-role.dto';

@ApiTags('Clans')
@ApiBearerAuth()
@Controller('clans')
@UseGuards(AuthGuard)
export class ClansController {
  constructor(private readonly clansService: ClansService) {}

  @Get()
  list(@Req() req: RequestWithUser) {
    return this.clansService.listClans(req.user.sub);
  }

  @Get('me')
  getMine(@Req() req: RequestWithUser) {
    return this.clansService.getMyClan(req.user.sub);
  }

  @Get('leaderboard')
  leaderboard(@Req() req: RequestWithUser) {
    return this.clansService.getLeaderboard(req.user.sub);
  }

  @Post()
  create(@Req() req: RequestWithUser, @Body() dto: CreateClanDto) {
    return this.clansService.createClan(req.user.sub, dto);
  }

  @Post(':clanId/join')
  join(@Req() req: RequestWithUser, @Param('clanId') clanId: string) {
    return this.clansService.joinClan(req.user.sub, clanId);
  }

  @Post('leave')
  leave(@Req() req: RequestWithUser) {
    return this.clansService.leaveClan(req.user.sub);
  }

  @Post('members/:profileId/role')
  updateRole(
    @Req() req: RequestWithUser,
    @Param('profileId', ParseIntPipe) profileId: number,
    @Body() dto: UpdateClanRoleDto,
  ) {
    return this.clansService.updateMemberRole(req.user.sub, profileId, dto.role);
  }

  @Delete('members/:profileId')
  removeMember(@Req() req: RequestWithUser, @Param('profileId', ParseIntPipe) profileId: number) {
    return this.clansService.removeMember(req.user.sub, profileId);
  }

  @Get('shop')
  shop(@Req() req: RequestWithUser) {
    return this.clansService.getShop(req.user.sub);
  }

  @Post('shop/:bannerCode/buy')
  buyBanner(@Req() req: RequestWithUser, @Param('bannerCode') bannerCode: string) {
    return this.clansService.buyBanner(req.user.sub, bannerCode);
  }

  @Post('banners/:bannerCode/equip')
  equipBanner(@Req() req: RequestWithUser, @Param('bannerCode') bannerCode: string) {
    return this.clansService.equipBanner(req.user.sub, bannerCode);
  }
}
