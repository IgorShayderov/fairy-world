import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ChatModule } from './chat/chat.module';
import { ShopModule } from './shop/shop.module';

@Module({
  imports: [AuthModule, UsersModule, ChatModule, ShopModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
