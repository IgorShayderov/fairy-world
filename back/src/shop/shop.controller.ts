import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOkResponse, ApiBearerAuth, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { ShopService } from './shop.service';
import { BuyDto } from './dto/buy.dto';
import { AuthGuard } from '../auth/auth.guard';

@ApiTags('shop')
@Controller('shop')
export class ShopController {
  constructor(private readonly shopService: ShopService) {}

  @Get('items')
  @ApiOkResponse({ description: 'List of all items in shop' })
  getItems() {
    return this.shopService.getItems();
  }

  @Post('buy')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Item purchased' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  async buy(@Body() buyDto: BuyDto, @Req() req: any) {
    return this.shopService.buy(req.user.sub, buyDto);
  }

  @Post('sell')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Item sold' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  async sell(@Body() sellDto: { name: string; quantity: number }, @Req() req: any) {
    return this.shopService.sell(req.user.sub, sellDto);
  }

  @Get('inventory')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'User inventory' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  getInventory(@Req() req: any) {
    return this.shopService.getInventory(req.user.sub);
  }
}
