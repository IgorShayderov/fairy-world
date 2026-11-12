import { Module } from '@nestjs/common';
import { LocationsService } from './locations.service';
import { LocationsController } from './locations.controller';
import { PrismaService } from '../prisma.service';
import { ItemSocketsService } from './item-sockets';
import { ItemSocketsController } from './item-sockets.controller';

@Module({
  controllers: [LocationsController, ItemSocketsController],
  providers: [LocationsService, ItemSocketsService, PrismaService],
  exports: [LocationsService],
})
export class LocationsModule {}
