import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { QuestsController } from './quests.controller';
import { QuestsService } from './quests.service';
import { StoryQuestsService } from './story-quests.service';
import { StoryQuestsController } from './story-quests.controller';

@Module({
  controllers: [QuestsController, StoryQuestsController],
  providers: [QuestsService, StoryQuestsService, PrismaService],
})
export class QuestsModule {}
