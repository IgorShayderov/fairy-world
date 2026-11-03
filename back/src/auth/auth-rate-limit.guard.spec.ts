import { ExecutionContext } from '@nestjs/common';
import { AuthRateLimitGuard } from './auth-rate-limit.guard';

describe('Authentication request limits', () => {
  const setHeader = jest.fn();
  const context = (action = 'signIn', ip = '127.0.0.1') =>
    ({
      getHandler: () => ({ name: action }),
      switchToHttp: () => ({ getRequest: () => ({ ip }), getResponse: () => ({ setHeader }) }),
    }) as unknown as ExecutionContext;

  afterEach(() => jest.restoreAllMocks());

  it('limits login attempts per IP and permits another IP', () => {
    const guard = new AuthRateLimitGuard();
    for (let i = 0; i < 20; i++) expect(guard.canActivate(context())).toBe(true);
    expect(() => guard.canActivate(context())).toThrow('Too many attempts');
    expect(guard.canActivate(context('signIn', '127.0.0.2'))).toBe(true);
    expect(setHeader).toHaveBeenCalledWith('Retry-After', expect.any(Number));
  });

  it('bounds reset emails and permits attempts after the window expires', () => {
    jest.spyOn(Date, 'now').mockReturnValue(1000);
    const guard = new AuthRateLimitGuard();
    for (let i = 0; i < 5; i++) guard.canActivate(context('forgotPassword'));
    expect(() => guard.canActivate(context('forgotPassword'))).toThrow('Too many attempts');
    jest.spyOn(Date, 'now').mockReturnValue(1000 + 15 * 60 * 1000);
    expect(guard.canActivate(context('forgotPassword'))).toBe(true);
  });
});
