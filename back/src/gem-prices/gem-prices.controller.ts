import { Body, Controller, Get, Header, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { AdminAuthGuard } from '../feedback/admin-auth.guard';
import { PrismaService } from '../prisma.service';
import { gemActionCosts } from './gem-prices';
import { GemPriceDto } from './gem-prices.dto';

@Controller('admin/gem-prices')
@UseGuards(AdminAuthGuard)
export class AdminGemPricesController {
  constructor(private readonly prisma: PrismaService) {}
  @Get()
  @Header('Cache-Control', 'no-store')
  list() {
    return gemActionCosts(this.prisma);
  }

  @Post()
  async save(@Body() dto: GemPriceDto) {
    await this.prisma.gemActionPrice.upsert({
      where: { key: dto.key },
      create: { key: dto.key, cost: dto.cost },
      update: { cost: dto.cost },
    });
    return gemActionCosts(this.prisma);
  }
}

@Controller('game/gem-prices')
@UseGuards(AuthGuard)
export class GemPricesController {
  constructor(private readonly prisma: PrismaService) {}
  @Get()
  @Header('Cache-Control', 'no-store')
  list() {
    return gemActionCosts(this.prisma);
  }
}
