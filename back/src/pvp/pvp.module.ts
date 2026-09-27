import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { UsersModule } from '../users/users.module';
import { PvpShopController } from './pvp-shop.controller';
import { PvpShopService } from './pvp-shop.service';
import { PvpController } from './pvp.controller';
import { PvpService } from './pvp.service';

@Module({
  imports: [UsersModule],
  controllers: [PvpController, PvpShopController],
  providers: [PvpService, PvpShopService, PrismaService],
  exports: [PvpService],
})
export class PvpModule {}
