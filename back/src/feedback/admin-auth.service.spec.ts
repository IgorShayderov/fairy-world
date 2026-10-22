import { ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthGuard } from '../auth/auth.guard';
import { PrismaService } from '../prisma.service';
import { AdminAuthService, adminTokenHash, ADMIN_SESSION_MS } from './admin-auth.service';
import { AdminAuthGuard } from './admin-auth.guard';

describe('Separate admin authentication', () => {
  const prisma = {
    user: { findUnique: jest.fn() },
    adminSession: { create: jest.fn(), findUnique: jest.fn(), deleteMany: jest.fn() },
  };
  let service: AdminAuthService;
  let passwordHash: string;
  const token = `adm_${'a'.repeat(43)}`;
  beforeAll(async () => {
    passwordHash = await bcrypt.hash('test-password', 10);
  });
  beforeEach(() => {
    jest.resetAllMocks();
    service = new AdminAuthService(prisma as unknown as PrismaService);
    prisma.user.findUnique.mockResolvedValue({
      id: 1,
      name: 'Admin',
      email: 'admin@example.invalid',
      role: 'ADMIN',
      password: passwordHash,
    });
    prisma.adminSession.findUnique.mockResolvedValue({
      id: 'session',
      expiresAt: new Date(Date.now() + 10000),
      user: { id: 1, name: 'Admin', email: 'admin@example.invalid', role: 'ADMIN' },
    });
  });
  it('issues an independent token and persists only its hash for eight hours', async () => {
    const before = Date.now();
    const result = await service.login('admin@example.invalid', 'test-password', 'local');
    expect(result.token).toMatch(/^adm_[A-Za-z0-9_-]{43}$/);
    expect(result.expiresAt.getTime()).toBeGreaterThanOrEqual(before + ADMIN_SESSION_MS);
    expect(prisma.adminSession.create).toHaveBeenCalledWith({
      data: { userId: 1, tokenHash: adminTokenHash(result.token), expiresAt: result.expiresAt },
    });
    expect(result.admin).not.toHaveProperty('password');
  });
  it.each(['USER', 'missing', 'bad-password'])('denies %s without issuing an admin session', async (mode) => {
    if (mode === 'missing') prisma.user.findUnique.mockResolvedValue(null);
    if (mode === 'USER') prisma.user.findUnique.mockResolvedValue({ id: 1, role: 'USER', password: passwordHash });
    await expect(
      service.login('admin@example.invalid', mode === 'bad-password' ? 'wrong' : 'test-password', 'local'),
    ).rejects.toThrow('Invalid admin credentials');
    expect(prisma.adminSession.create).not.toHaveBeenCalled();
  });
  it('rejects game JWTs, missing and malformed tokens before database lookup', async () => {
    const game = new JwtService().sign({ sub: 1 }, { secret: 'test-secret' });
    for (const value of [undefined, game, 'adm_short'])
      await expect(service.authenticate(value)).rejects.toThrow('Admin login required');
    expect(prisma.adminSession.findUnique).not.toHaveBeenCalled();
  });
  it.each(['expired', 'revoked', 'demoted'])('rejects %s sessions', async (mode) => {
    prisma.adminSession.findUnique.mockResolvedValue(
      mode === 'revoked'
        ? null
        : {
            id: 'session',
            expiresAt: new Date(Date.now() + (mode === 'expired' ? -1 : 10000)),
            user: { role: mode === 'demoted' ? 'USER' : 'ADMIN' },
          },
    );
    await expect(service.authenticate(token)).rejects.toThrow('expired or revoked');
  });
  it('authenticates the current admin and revokes logout at the server', async () => {
    await expect(service.authenticate(token)).resolves.toEqual({
      id: 1,
      name: 'Admin',
      email: 'admin@example.invalid',
      sessionId: 'session',
    });
    await service.logout('session');
    expect(prisma.adminSession.deleteMany).toHaveBeenCalledWith({ where: { id: 'session' } });
  });
  it('admin guard reads only the bearer token and game guard rejects admin tokens', async () => {
    const request = { headers: { authorization: `Bearer ${token}` } };
    const context = { switchToHttp: () => ({ getRequest: () => request }) } as unknown as ExecutionContext;
    await expect(new AdminAuthGuard(service).canActivate(context)).resolves.toBe(true);
    expect(request).toHaveProperty('admin.sessionId', 'session');
    await expect(new AuthGuard(new JwtService()).canActivate(context)).rejects.toThrow();
  });
  it('rate-limits password attempts', async () => {
    for (let i = 0; i < 10; i++) await service.login('admin@example.invalid', 'test-password', 'local');
    await expect(service.login('admin@example.invalid', 'test-password', 'local')).rejects.toMatchObject({
      status: 429,
    });
    expect(prisma.user.findUnique).toHaveBeenCalledTimes(10);
  });
});
