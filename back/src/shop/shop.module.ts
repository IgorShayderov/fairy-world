import { Module } from '@nestjs/common';
import { ShopController } from './shop.controller';
import { ShopService } from './shop.service';
import { PrismaService } from '../prisma.service';
import { ItemsModule } from '../items/items.module';

@Module({
  imports: [ItemsModule],
  controllers: [ShopController],
  providers: [ShopService, PrismaService],
  exports: [ShopService],
})
export class ShopModule {}
