import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard, RefreshGuard } from './auth.guard';
import { refreshTokenHash } from './token-security';

describe('Token isolation', () => {
  const jwt = new JwtService();
  const secret = 'test-only-secret';
  const context = (request: unknown) =>
    ({
      switchToHttp: () => ({ getRequest: () => request }),
    }) as ExecutionContext;
  const previousSecret = process.env.JWT_SECRET;
  beforeAll(() => {
    process.env.JWT_SECRET = secret;
  });
  afterAll(() => {
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  });

  it.each(['access', 'refresh', undefined])('only access tokens authorize API requests (%s)', async (type) => {
    const token = jwt.sign({ sub: 1, email: 'a@example.com', type }, { secret });
    const result = new AuthGuard(jwt).canActivate(context({ headers: { authorization: `Bearer ${token}` } }));
    if (type === 'access') await expect(result).resolves.toBe(true);
    else await expect(result).rejects.toThrow(UnauthorizedException);
  });

  it.each(['access', 'refresh', undefined])('only refresh tokens authorize refresh (%s)', async (type) => {
    const token = jwt.sign({ sub: 1, type }, { secret });
    const result = new RefreshGuard(jwt).canActivate(context({ cookies: { refresh_token: token } }));
    if (type === 'refresh') await expect(result).resolves.toBe(true);
    else await expect(result).rejects.toThrow(UnauthorizedException);
  });

  it('rejects malformed subject and malformed cookie without a server error', async () => {
    const token = jwt.sign({ sub: '1', type: 'access', email: 'a@example.com' }, { secret });
    await expect(
      new AuthGuard(jwt).canActivate(context({ headers: { authorization: `Bearer ${token}` } })),
    ).rejects.toThrow(UnauthorizedException);
    await expect(new RefreshGuard(jwt).canActivate(context({ cookies: { refresh_token: '%broken' } }))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('hashes the entire refresh token, including bytes after bcrypt truncation', () => {
    const prefix = 'a'.repeat(100);
    expect(refreshTokenHash(`${prefix}one`)).not.toEqual(refreshTokenHash(`${prefix}two`));
  });
});
