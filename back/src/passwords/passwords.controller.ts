import { Controller, Body, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiUnauthorizedResponse, ApiTags } from '@nestjs/swagger';

import { AuthService } from '../auth/auth.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { PasswordsService } from './passwords.service';

@ApiTags('passwords')
@Controller('passwords')
export class PasswordsController {
  constructor(
    private authService: AuthService,
    private passwordsService: PasswordsService,
  ) {}

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
