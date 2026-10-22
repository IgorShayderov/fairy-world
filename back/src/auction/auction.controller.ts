import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { AuctionQueryDto, CreateAuctionDto } from './auction.dto';
import { AuctionService } from './auction.service';

interface AuthRequest {
  user: { sub: number };
}

@Controller('auction')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class AuctionController {
  constructor(private readonly auctions: AuctionService) {}
  @Get()
  list(@Req() req: AuthRequest, @Query() query: AuctionQueryDto) {
    return this.auctions.list(req.user.sub, query);
  }
  @Post()
  create(@Req() req: AuthRequest, @Body() dto: CreateAuctionDto) {
    return this.auctions.create(req.user.sub, dto);
  }
  @Post(':id/buy')
  buy(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.auctions.buy(req.user.sub, id);
  }
}

@Controller('notifications')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly auctions: AuctionService) {}
  @Get('summary')
  summary(@Req() req: AuthRequest) {
    return this.auctions.summary(req.user.sub);
  }
  @Get()
  list(@Req() req: AuthRequest, @Query() query: AuctionQueryDto) {
    return this.auctions.notifications(req.user.sub, query.page);
  }
  @Post(':id/read')
  read(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.auctions.markRead(req.user.sub, id);
  }
  @Post(':id/claim')
  claim(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.auctions.claim(req.user.sub, id);
  }
}
