import { Module } from '@nestjs/common';
import { MonstersModule } from '../monsters/monsters.module';
import { PrismaService } from '../prisma.service';
import { SkillsController } from './skills.controller';
import { SkillsService } from './skills.service';

@Module({ imports: [MonstersModule], controllers: [SkillsController], providers: [SkillsService, PrismaService] })
export class SkillsModule {}
