import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { BuyPvpShopOfferDto } from './dto/buy-pvp-shop-offer.dto';
import { PvpShopService } from './pvp-shop.service';

interface PvpShopRequest extends Request {
  user: { sub: number };
}

@Controller('pvp/shop')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class PvpShopController {
  constructor(private readonly pvpShopService: PvpShopService) {}

  @Get()
  @ApiOkResponse({ description: 'Returns the player-specific daily PvP shop' })
  getShop(@Req() req: PvpShopRequest) {
    return this.pvpShopService.getShop(req.user.sub);
  }

  @Post('buy')
  buy(@Req() req: PvpShopRequest, @Body() dto: BuyPvpShopOfferDto) {
    return this.pvpShopService.buy(req.user.sub, dto.offerId);
  }
}
