import { createHash, randomBytes } from 'node:crypto';
import { HttpException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma.service';

export const ADMIN_SESSION_MS = 8 * 60 * 60 * 1000;
export const adminTokenHash = (token: string) => createHash('sha256').update(token).digest('hex');

@Injectable()
export class AdminAuthService {
  private readonly attempts = new Map<string, { count: number; expires: number }>();
  private dummyHash?: Promise<string>;
  constructor(private readonly prisma: PrismaService) {}

  private throttle(email: string, ip: string) {
    const now = Date.now();
    for (const [key, entry] of this.attempts) if (entry.expires <= now) this.attempts.delete(key);
    for (const key of [`ip:${ip}`, `email:${email.toLowerCase()}`]) {
      const entry = this.attempts.get(key) ?? { count: 0, expires: now + 15 * 60 * 1000 };
      if (entry.count >= 10 || this.attempts.size >= 10000)
        throw new HttpException('Too many login attempts. Try again in 15 minutes.', 429);
      entry.count++;
      this.attempts.set(key, entry);
    }
  }

  async login(email: string, password: string, ip: string) {
    this.throttle(email, ip);
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true, role: true, password: true },
    });
    this.dummyHash ??= bcrypt.hash('not-a-real-admin-password', 10);
    const valid = await bcrypt.compare(password, user?.password ?? (await this.dummyHash));
    if (!user || user.role !== 'ADMIN' || !valid) throw new UnauthorizedException('Invalid admin credentials');
    // Opaque tokens cannot be mistaken for game JWTs. Only their hashes are persisted.
    const token = `adm_${randomBytes(32).toString('base64url')}`;
    const expiresAt = new Date(Date.now() + ADMIN_SESSION_MS);
    await this.prisma.adminSession.create({ data: { userId: user.id, tokenHash: adminTokenHash(token), expiresAt } });
    return { token, expiresAt, admin: { id: user.id, name: user.name, email: user.email } };
  }

  async authenticate(token?: string) {
    if (!token || !/^adm_[A-Za-z0-9_-]{43}$/.test(token)) throw new UnauthorizedException('Admin login required');
    const session = await this.prisma.adminSession.findUnique({
      where: { tokenHash: adminTokenHash(token) },
      include: { user: { select: { id: true, name: true, email: true, role: true } } },
    });
    if (!session || session.expiresAt <= new Date() || session.user.role !== 'ADMIN')
      throw new UnauthorizedException('Admin session expired or revoked');
    return { id: session.user.id, name: session.user.name, email: session.user.email, sessionId: session.id };
  }

  async logout(sessionId: string) {
    await this.prisma.adminSession.deleteMany({ where: { id: sessionId } });
    return { success: true };
  }

  @Cron('0 0 3 * * *', { name: 'admin-session-cleanup', timeZone: 'UTC' })
  async cleanExpiredSessions() {
    await this.prisma.adminSession.deleteMany({ where: { expiresAt: { lte: new Date() } } });
  }
}
