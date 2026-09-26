import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { UsersModule } from '../users/users.module';
import { PvpController } from './pvp.controller';
import { PvpService } from './pvp.service';

@Module({
  imports: [UsersModule],
  controllers: [PvpController],
  providers: [PvpService, PrismaService],
  exports: [PvpService],
})
export class PvpModule {}
