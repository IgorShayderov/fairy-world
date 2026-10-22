import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { AdminAuthService } from './admin-auth.service';

export interface AdminRequest extends Request {
  admin: { id: number; name: string; email: string; sessionId: string };
}

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(private readonly auth: AdminAuthService) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AdminRequest>();
    const [scheme, token] = request.headers.authorization?.split(' ') ?? [];
    request.admin = await this.auth.authenticate(scheme === 'Bearer' ? token : undefined);
    return true;
  }
}
