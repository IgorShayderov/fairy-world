import { Controller, Body, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { AuthRateLimitGuard } from '../auth/auth-rate-limit.guard';
import { ApiBody, ApiOkResponse, ApiUnauthorizedResponse, ApiTags } from '@nestjs/swagger';

import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { PasswordsService } from './passwords.service';

@ApiTags('passwords')
@Controller('passwords')
@UseGuards(AuthRateLimitGuard)
export class PasswordsController {
  constructor(private passwordsService: PasswordsService) {}

  @Post('forgot')
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: ForgotPasswordDto })
  @ApiOkResponse({ description: 'Запрос принят.' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.passwordsService.requestPasswordReset(dto.email);

    return {
      message: 'Если аккаунт существует, инструкции будут отправлены на email.',
    };
  }

  @Post('reset')
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: ResetPasswordDto })
  @ApiOkResponse({ description: 'Пароль успешно изменён' })
  @ApiUnauthorizedResponse({ description: 'Неверный или просроченный токен' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.passwordsService.resetPassword(dto.token, dto.password);

    return { message: 'Пароль успешно изменён' };
  }
}
