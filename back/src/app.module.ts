import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PremiumModule } from './premium/premium.module';
import { MailerModule } from '@nestjs-modules/mailer';
import { join } from 'path';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/adapters/handlebars.adapter';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ChatModule } from './chat/chat.module';
import { ShopModule } from './shop/shop.module';
import { PasswordsModule } from './passwords/passwords.module';
import { LocationsModule } from './locations/locations.module';
import { MonstersModule } from './monsters/monsters.module';
import { QuestsModule } from './quests/quests.module';
import { CraftingModule } from './crafting/crafting.module';
import { PvpModule } from './pvp/pvp.module';
import { ClansModule } from './clans/clans.module';
import { SkillsModule } from './skills/skills.module';
import { AuctionModule } from './auction/auction.module';
import { FeedbackModule } from './feedback/feedback.module';
import { AdminUsersModule } from './admin-users/admin-users.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PremiumModule,
    AuthModule,
    UsersModule,
    ChatModule,
    ShopModule,
    PasswordsModule,
    LocationsModule,
    MonstersModule,
    QuestsModule,
    CraftingModule,
    PvpModule,
    ClansModule,
    SkillsModule,
    AuctionModule,
    FeedbackModule,
    AdminUsersModule,
    MailerModule.forRoot({
      transport: {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT ?? '1025', 10),
        ignoreTLS: process.env.NODE_ENV !== 'production',
        auth: process.env.SMTP_USER
          ? {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASSWORD,
            }
          : undefined,
      },
      defaults: {
        from: `"No Reply" <${process.env.SMTP_FROM}>`,
      },
      template: {
        dir: join(__dirname, 'mail/templates'),
        adapter: new HandlebarsAdapter(),
        options: {
          strict: true,
        },
      },
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
