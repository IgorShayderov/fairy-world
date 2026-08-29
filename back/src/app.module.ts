import { Module } from '@nestjs/common';
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

@Module({
  imports: [
    AuthModule,
    UsersModule,
    ChatModule,
    ShopModule,
    PasswordsModule,
    LocationsModule,
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
