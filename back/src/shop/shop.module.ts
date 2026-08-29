import { Module } from '@nestjs/common';
import { ShopController } from './shop.controller';
import { ShopService } from './shop.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [ShopController],
  providers: [ShopService, PrismaService],
  exports: [ShopService],
})
export class ShopModule {}
