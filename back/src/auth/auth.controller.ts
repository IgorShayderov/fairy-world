import { Body, Controller, Get, HttpCode, HttpStatus, Post, Request, Res, UseGuards } from '@nestjs/common';
import {
  ApiBody,
  ApiCookieAuth,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiBearerAuth,
  ApiTags,
  ApiCreatedResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';

import { AuthService } from './auth.service';
import { AuthGuard, RefreshGuard } from './auth.guard';
import { LoginDto } from './dto/login.dto';
import { Response } from 'express';

import type { RequestWithUser } from './interfaces/request-with-user.interface';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiBody({ type: RegisterDto })
  @ApiCreatedResponse({
    description: 'User successfully registered',
    schema: {
      example: {
        access_token: 'eyJhbG...VCJ9...',
        expiresIn: 60,
        user: {
          id: 1,
          name: 'Alice',
          email: 'alice@example.com',
        },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  async register(@Body() registerDto: RegisterDto) {
    const result = await this.authService.register(registerDto);
    return { access_token: result.access_token, expiresIn: result.expiresIn, user: result.user };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({
    description: 'Successfully authenticated',
    schema: {
      example: {
        access_token: 'eyJhbG...VCJ9...',
        expiresIn: 60,
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  async signIn(@Body() signInDto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { access_token, expiresIn, refresh_token } = await this.authService.signIn(
      signInDto.email,
      signInDto.password,
    );

    res.cookie('refresh_token', refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: parseInt(process.env.REFRESH_COOKIE_LIFETIME ?? '604800', 10),
    });

    return { access_token, expiresIn };
  }

  @UseGuards(RefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth()
  @ApiOkResponse({
    description: 'Refresh successful',
    schema: {
      example: {
        access_token: 'eyJhbG...VCJ9...',
        expiresIn: 60,
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Invalid refresh token' })
  async refreshToken(@Request() req: RequestWithUser, @Res({ passthrough: true }) res: Response) {
    const oldRefreshToken = req.cookies['refresh_token'] as string;
    const { access_token, expiresIn, refresh_token } = await this.authService.refreshTokens(
      req.user.sub,
      oldRefreshToken,
    );

    res.cookie('refresh_token', refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: parseInt(process.env.REFRESH_COOKIE_LIFETIME ?? '604800', 10),
    });

    return { access_token, expiresIn };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOkResponse({ description: 'Logout successful, cookie cleared' })
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
  }

  /**
   * Endpoint for requesting password reset.
   * Always returns success to prevent user enumeration.
   */
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: ForgotPasswordDto })
  @ApiOkResponse({
    description: 'If the email exists, a reset token will be sent',
    schema: {
      example: {
        message: 'Если аккаунт существует, инструкции для восстановления будут отправлены на email.',
      },
    },
  })
  async requestPasswordReset(@Body() dto: ForgotPasswordDto) {
    return this.authService.requestPasswordReset(dto);
  }

  /**
   * Endpoint for resetting password using a valid token.
   */
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: ResetPasswordDto })
  @ApiOkResponse({
    description: 'Password successfully reset',
    schema: {
      example: {
        message: 'Пароль успешно обновлён.',
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid or expired token' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @UseGuards(AuthGuard)
  @Get('profile')
  @ApiBearerAuth()
  @ApiOkResponse({
    description: 'User profile',
    schema: {
      example: {
        sub: 1,
        email: 'john@mail.ru',
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  getProfile(@Request() req: RequestWithUser) {
    return req.user;
  }
}
