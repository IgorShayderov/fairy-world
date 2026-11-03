import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

import type { RequestWithUser } from './interfaces/request-with-user.interface';
import type { AccessTokenPayload } from './interfaces/token-payload.interface';
import { isAccessPayload, jwtSecret } from './token-security';

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
        secret: jwtSecret(),
        algorithms: ['HS256'],
      });
      if (!isAccessPayload(payload)) throw new UnauthorizedException();

      request['user'] = { sub: payload.sub, email: payload.email, type: 'access' };
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
        secret: jwtSecret(),
        algorithms: ['HS256'],
      });
      if (payload.type !== 'refresh' || !Number.isSafeInteger(payload.sub) || payload.sub <= 0) {
        throw new UnauthorizedException();
      }

      request['user'] = { sub: payload.sub, type: 'refresh' };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return true;
  }

  private extractRefreshTokenFromCookie(request: Request): string | undefined {
    const token: unknown = request.cookies?.refresh_token;
    return typeof token === 'string' ? token : undefined;
  }
}
