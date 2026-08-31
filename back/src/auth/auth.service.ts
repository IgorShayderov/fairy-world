import { Injectable, UnauthorizedException } from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
import * as bcrypt from 'bcrypt';

import type { TokenResult } from './interfaces/token-payload.interface';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async signIn(email: string, password: string): Promise<TokenResult> {
    const user = await this.usersService.findBy({ email });

    if (!user) {
      throw new UnauthorizedException();
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException();
    }

    return await this.generateTokens(user);
  }

  async refreshTokens(sub: number, oldRefreshToken: string): Promise<TokenResult> {
    const user = await this.usersService.findById(sub);

    if (!user || !user.hashedRefreshToken) {
      throw new UnauthorizedException('Пользователь не найден');
    }

    const isRefreshTokenValid = await bcrypt.compare(oldRefreshToken, user.hashedRefreshToken);
    if (!isRefreshTokenValid) {
      throw new UnauthorizedException('Access Denied');
    }

    return this.generateTokens(user);
  }

  private async generateTokens(user: { id: number; email: string }): Promise<TokenResult> {
    const payload = { sub: user.id, email: user.email };
    const expiresIn = parseInt(process.env.ACCESS_COOKIE_LIFETIME as string, 10);

    const refreshExpiresIn = parseInt(process.env.REFRESH_COOKIE_LIFETIME as string, 10);

    const [access_token, refresh_token] = await Promise.all([
      this.jwtService.signAsync(payload, { expiresIn, secret: process.env.JWT_SECRET }),
      this.jwtService.signAsync(
        { sub: user.id, type: 'refresh' },
        { expiresIn: refreshExpiresIn, secret: process.env.JWT_SECRET },
      ),
    ]);

    await this.updateRefreshToken(user.id, refresh_token);

    return {
      access_token,
      refresh_token,
      expiresIn,
    };
  }

  private async updateRefreshToken(userId: number, refreshToken: string) {
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.usersService.update(userId, { hashedRefreshToken });
  }

  async logout(userId: number) {
    await this.usersService.update(userId, { hashedRefreshToken: null });
  }
}
