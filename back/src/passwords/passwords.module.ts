import { Module } from '@nestjs/common';
import { PasswordsController } from './passwords.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [PasswordsController],
})
export class PasswordsModule {}
