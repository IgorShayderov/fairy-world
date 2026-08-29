import { Module } from '@nestjs/common';
import { PasswordsController } from './passwords.controller';
import { AuthModule } from '../auth/auth.module';
import { PasswordsService } from './passwords.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [AuthModule, UsersModule],
  controllers: [PasswordsController],
  providers: [PasswordsService],
})
export class PasswordsModule {}
