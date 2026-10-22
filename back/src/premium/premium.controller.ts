import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import type { RequestWithUser } from '../auth/interfaces/request-with-user.interface';
import { PremiumService } from './premium.service';
import { GemPurchaseDto } from '../gem-prices/gem-prices.dto';

@Controller('premium')
@UseGuards(AuthGuard)
export class PremiumController {
  constructor(private readonly premium: PremiumService) {}

  @Post('purchase')
  buy(@Request() request: RequestWithUser, @Body() dto: GemPurchaseDto = {}) {
    return this.premium.buy(request.user.sub, dto.expectedCost);
  }
}
