import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
import { ItemsModule } from '../items/items.module';

@Module({
  imports: [
    UsersModule,
    ItemsModule,
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'access-secret',
      signOptions: { expiresIn: '60s' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, PrismaService],
  exports: [AuthService],
})
export class AuthModule {}
