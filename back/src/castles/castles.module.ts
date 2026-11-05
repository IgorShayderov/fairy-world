import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CastlesController } from './castles.controller';
import { CastlesService } from './castles.service';

@Module({ controllers: [CastlesController], providers: [PrismaService, CastlesService] })
export class CastlesModule {}
