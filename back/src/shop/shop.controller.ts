import { Controller, Get, Post, UseGuards, Body, Req } from '@nestjs/common';
import { ApiOkResponse, ApiUnauthorizedResponse, ApiBearerAuth } from '@nestjs/swagger';

import { ShopService } from './shop.service';
import { SellDto } from './dto/sell.dto';
import { BuyDto } from './dto/buy.dto';
import { AuthGuard } from '../auth/auth.guard';

export interface ShopRequest extends Request {
  user: {
    sub: number;
  };
}

@Controller('shop')
export class ShopController {
  constructor(private readonly shopService: ShopService) {}

  @Get('items')
  @UseGuards(AuthGuard)
  @ApiOkResponse({ description: 'List of all items in shop' })
  getItems() {
    return this.shopService.getItems();
  }

  @Post('buy')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Item purchased' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  async buy(@Body() buyDto: BuyDto, @Req() req: ShopRequest) {
    return this.shopService.buy(req.user.sub, buyDto);
  }

  @Post('sell')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Item sold' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  async sell(@Body() sellDto: SellDto, @Req() req: ShopRequest) {
    return this.shopService.sell(req.user.sub, sellDto);
  }

  @Get('inventory')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'User inventory' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  getInventory(@Req() req: ShopRequest) {
    return this.shopService.getInventory(req.user.sub);
  }
}
