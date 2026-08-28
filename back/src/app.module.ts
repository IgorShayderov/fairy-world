import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ChatModule } from './chat/chat.module';
import { ShopModule } from './shop/shop.module';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    ChatModule,
    ShopModule,
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
          : undefined, // У Mailpit нет авторизации по умолчанию
      },
      defaults: {
        from: `"No Reply" <${process.env.SMTP_FROM}>`,
      },
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
