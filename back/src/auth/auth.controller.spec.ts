import { JwtService } from '@nestjs/jwt';
import { Response } from 'express';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import type { RequestWithUser } from './interfaces/request-with-user.interface';

describe('AuthController', () => {
  let controller: AuthController;

  const mockAuthService = {
    signIn: jest.fn(),
    refreshTokens: jest.fn(),
  };

  const mockJwtService = {
    verifyAsync: jest.fn(),
  };

  const originalEnv = process.env;

  beforeAll(() => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'development',
      REFRESH_COOKIE_LIFETIME: '604800',
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('signIn', () => {
    it('should call AuthService.signIn and set cookie', async () => {
      const dto = { email: 'john@mail.ru', password: 'Qwerty123!' };
      const result = {
        access_token: 'token',
        refresh_token: 'refresh',
        expiresIn: 60,
      };
      mockAuthService.signIn.mockResolvedValue(result);

      const cookieSpy = jest.fn();
      const mockRes = { cookie: cookieSpy } as unknown as Response;

      const response = await controller.signIn(dto, mockRes);

      expect(mockAuthService.signIn).toHaveBeenCalledWith('john@mail.ru', 'Qwerty123!');
      expect(cookieSpy).toHaveBeenCalledWith('refresh_token', 'refresh', {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 604800,
      });
      expect(response).toEqual({ access_token: 'token', expiresIn: 60 });
    });
  });

  describe('refreshToken', () => {
    it('should call AuthService.refreshTokens and set new cookie', async () => {
      const result = {
        access_token: 'new_token',
        expiresIn: 60,
        refresh_token: 'new_refresh',
      };
      mockAuthService.refreshTokens.mockResolvedValue(result);

      const cookieSpy = jest.fn();
      const mockRes = { cookie: cookieSpy } as unknown as Response;
      const mockReq = {
        user: { sub: 1 },
        cookies: { refresh_token: 'old_refresh_token_value' },
      } as unknown as RequestWithUser;

      const response = await controller.refreshToken(mockReq, mockRes);

      expect(mockAuthService.refreshTokens).toHaveBeenCalledWith(1, 'old_refresh_token_value');
      expect(cookieSpy).toHaveBeenCalledWith('refresh_token', 'new_refresh', {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 604800,
      });
      expect(response).toEqual({ access_token: 'new_token', expiresIn: 60 });
    });
  });

  describe('logout', () => {
    it('should clear refresh_token cookie', () => {
      const clearCookieSpy = jest.fn();
      const mockRes = { clearCookie: clearCookieSpy } as unknown as Response;

      controller.logout(mockRes);

      expect(clearCookieSpy).toHaveBeenCalledWith('refresh_token', {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
      });
    });
  });

  describe('getProfile', () => {
    it('should return req.user', () => {
      const req = { user: { sub: 1, email: 'john@mail.ru' } } as unknown as RequestWithUser;
      const result = controller.getProfile(req);

      expect(result).toEqual({ sub: 1, email: 'john@mail.ru' });
    });
  });
});
