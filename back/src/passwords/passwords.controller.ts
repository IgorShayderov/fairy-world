import { Controller, Body, HttpCode, HttpStatus, Post, Logger } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiUnauthorizedResponse, ApiTags } from '@nestjs/swagger';

import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { PasswordsService } from './passwords.service';

@ApiTags('passwords')
@Controller('passwords')
export class PasswordsController {
  constructor(private passwordsService: PasswordsService) {}
  private readonly logger = new Logger(PasswordsController.name);

  @Post('forgot')
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: ForgotPasswordDto })
  @ApiOkResponse({ description: 'Запрос принят.' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    this.logger.log(`Получен запрос на сброс пароля для email: ${dto.email}`);

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
    this.logger.log(`Попытка изменения пароля. Токен: ${dto.token.substring(0, 10) + '...'}`);

    await this.passwordsService.resetPassword(dto.token, dto.password);

    this.logger.log('Пароль успешно изменен для токена');

    return { message: 'Пароль успешно изменён' };
  }
}
