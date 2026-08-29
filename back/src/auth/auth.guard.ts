import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

import type { RequestWithUser } from './interfaces/request-with-user.interface';
import type { AccessTokenPayload } from './interfaces/token-payload.interface';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException();
    }

    try {
      const payload = await this.jwtService.verifyAsync<AccessTokenPayload>(token, {
        secret: process.env.JWT_SECRET || 'access-secret',
      });

      request['user'] = { sub: payload.sub, email: payload.email };
    } catch {
      throw new UnauthorizedException();
    }

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}

@Injectable()
export class RefreshGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const refreshToken = this.extractRefreshTokenFromCookie(request);

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token missing');
    }

    try {
      const payload = await this.jwtService.verifyAsync<AccessTokenPayload>(refreshToken, {
        secret: process.env.JWT_SECRET,
      });

      request['user'] = { sub: payload.sub, type: 'refresh' };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return true;
  }

  private extractRefreshTokenFromCookie(request: Request): string | undefined {
    const cookieHeader = request.headers.cookie;
    if (!cookieHeader) return undefined;

    const cookies = cookieHeader.split(';').reduce<Record<string, string>>((acc, pair) => {
      const [key, ...vals] = pair.trim().split('=');
      if (key) acc[key] = decodeURIComponent(vals.join('='));
      return acc;
    }, {});

    return cookies['refresh_token'];
  }
}
