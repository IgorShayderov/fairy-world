import { JwtService } from '@nestjs/jwt';
import { Response, Request } from 'express';

import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;

  const mockAuthService = {
    signIn: jest.fn(),
    refreshTokens: jest.fn(),
  };

  const mockJwtService = {
    verifyAsync: jest.fn(),
  };

  beforeEach(async () => {
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
      expect(cookieSpy).toHaveBeenCalledWith('refresh_token', 'refresh', expect.objectContaining({ httpOnly: true }));
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
      const mockReq = { user: { sub: 1 } } as unknown as Request;

      const response = await controller.refreshToken(mockReq, mockRes);

      expect(mockAuthService.refreshTokens).toHaveBeenCalledWith(1);
      expect(cookieSpy).toHaveBeenCalledWith(
        'refresh_token',
        'new_refresh',
        expect.objectContaining({ httpOnly: true }),
      );
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
      const req = { user: { sub: 1, email: 'john@mail.ru' } } as unknown as Request;
      const result = controller.getProfile(req);

      expect(result).toEqual({ sub: 1, email: 'john@mail.ru' });
    });
  });
});
