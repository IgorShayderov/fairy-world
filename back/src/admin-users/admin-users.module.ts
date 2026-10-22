import { Module } from '@nestjs/common';
import { FeedbackModule } from '../feedback/feedback.module';
import { ItemsModule } from '../items/items.module';
import { MonstersModule } from '../monsters/monsters.module';
import { PrismaService } from '../prisma.service';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';

@Module({
  imports: [FeedbackModule, ItemsModule, MonstersModule],
  controllers: [AdminUsersController],
  providers: [PrismaService, AdminUsersService],
})
export class AdminUsersModule {}
