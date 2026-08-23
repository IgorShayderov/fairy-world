import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCookieAuth,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiBearerAuth,
  ApiTags,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { AuthGuard, RefreshGuard } from './auth.guard';
import { LoginDto } from './login.dto';
import { Response } from 'express';

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
  async signIn(
    @Body() signInDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.signIn(
      signInDto.email,
      signInDto.password,
    );

    res.cookie('refresh_token', result.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
    });

    return { access_token: result.access_token, expiresIn: result.expiresIn };
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
  async refreshToken(
    @Request() req,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.refreshTokens(req['user'].sub);

    res.cookie('refresh_token', result.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return { access_token: result.access_token, expiresIn: result.expiresIn };
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
  getProfile(@Request() req) {
    return req.user;
  }
}
