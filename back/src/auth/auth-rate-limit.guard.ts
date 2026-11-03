import { CanActivate, ExecutionContext, HttpException, Injectable } from '@nestjs/common';
import type { Request, Response } from 'express';

/** Single-process backstop. Multi-replica deployments also need a shared edge limiter. */
@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  private readonly attempts = new Map<string, { count: number; expiresAt: number }>();
  private nextCleanup = 0;

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const action = context.getHandler().name;
    const now = Date.now();
    const duration = 15 * 60 * 1000;
    const limit = action === 'forgotPassword' ? 5 : action === 'register' ? 10 : 20;
    if (now >= this.nextCleanup) {
      for (const [key, value] of this.attempts) if (value.expiresAt <= now) this.attempts.delete(key);
      this.nextCleanup = now + 60_000;
    }
    // Express's configured peer IP, never an untrusted X-Forwarded-For header.
    const key = `${action}:${request.ip ?? request.socket.remoteAddress ?? 'unknown'}`;
    const existing = this.attempts.get(key);
    const entry = existing && existing.expiresAt > now ? existing : { count: 0, expiresAt: now + duration };
    if (entry.count >= limit || (!existing && this.attempts.size >= 10000)) {
      response.setHeader('Retry-After', Math.max(1, Math.ceil((entry.expiresAt - now) / 1000)));
      throw new HttpException('Too many attempts. Please try again later.', 429);
    }
    entry.count++;
    this.attempts.set(key, entry);
    return true;
  }
}
