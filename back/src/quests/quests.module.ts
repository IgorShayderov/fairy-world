import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { QuestsController } from './quests.controller';
import { QuestsService } from './quests.service';

@Module({ controllers: [QuestsController], providers: [QuestsService, PrismaService] })
export class QuestsModule {}
