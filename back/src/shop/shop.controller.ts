import { Controller, Get, Post, UseGuards, Body, Req, Param, ParseIntPipe } from '@nestjs/common';
import { ApiOkResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ShopService } from './shop.service';
import { SellDto } from './dto/sell.dto';
import { BuyDto } from './dto/buy.dto';
import { AuthGuard } from '../auth/auth.guard';

export interface ShopRequest extends Request {
  user: { sub: number };
}

@Controller('shop')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class ShopController {
  constructor(private readonly shopService: ShopService) {}

  @Get(':shopId')
  @ApiOkResponse({ description: 'Shop details, stock, gold and player inventory/balance' })
  getShop(@Param('shopId', ParseIntPipe) shopId: number) {
    return this.shopService.getShop(shopId);
  }

  @Post(':shopId/buy')
  buy(@Param('shopId', ParseIntPipe) shopId: number, @Body() dto: BuyDto, @Req() req: ShopRequest) {
    return this.shopService.buy(req.user.sub, shopId, dto);
  }

  @Post(':shopId/sell')
  sell(@Param('shopId', ParseIntPipe) shopId: number, @Body() dto: SellDto, @Req() req: ShopRequest) {
    return this.shopService.sell(req.user.sub, shopId, dto);
  }
}
