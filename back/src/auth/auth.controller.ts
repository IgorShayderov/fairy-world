import { Body, Controller, HttpCode, HttpStatus, Post, Request, Res, UseGuards } from '@nestjs/common';
import { ApiBody, ApiCookieAuth, ApiOkResponse, ApiUnauthorizedResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RefreshGuard } from './auth.guard';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { Response } from 'express';

import type { RequestWithUser } from './interfaces/request-with-user.interface';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

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

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiBody({ type: RegisterDto })
  @ApiOkResponse({
    description: 'Successfully registered',
    schema: {
      example: {
        access_token: 'eyJhbG...VCJ9...',
        expiresIn: 60,
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Registration failed - validation or conflict' })
  async register(@Body() registerDto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const { access_token, expiresIn, refresh_token } = await this.authService.register(
      registerDto.email,
      registerDto.password,
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
}