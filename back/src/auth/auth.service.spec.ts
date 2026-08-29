import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;

  const mockUsersService = {
    findBy: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
  };

  const mockJwtService = {
    signAsync: jest.fn(),
  };

  const originalEnv = process.env;

  beforeAll(() => {
    process.env = {
      ...originalEnv,
      ACCESS_COOKIE_LIFETIME: '900',
      REFRESH_COOKIE_LIFETIME: '604800',
      JWT_SECRET: 'test_secret',
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('signIn', () => {
    const user = { id: 1, email: 'john@mail.ru', password: 'hashed_password' };

    it('should return access_token, refresh_token, expiresIn on success', async () => {
      mockUsersService.findBy.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new_hashed_refresh_token');

      mockJwtService.signAsync.mockResolvedValueOnce('access_token_value').mockResolvedValueOnce('refresh_token_value');

      const result = await service.signIn(user.email, 'Qwerty123!');

      expect(result).toEqual({
        access_token: 'access_token_value',
        refresh_token: 'refresh_token_value',
        expiresIn: 900,
      });

      expect(mockJwtService.signAsync).toHaveBeenCalledTimes(2);
      expect(mockJwtService.signAsync).toHaveBeenNthCalledWith(
        1,
        { sub: 1, email: 'john@mail.ru' },
        { expiresIn: 900, secret: 'test_secret' },
      );
      expect(mockJwtService.signAsync).toHaveBeenNthCalledWith(
        2,
        { sub: 1, type: 'refresh' },
        { expiresIn: 604800, secret: 'test_secret' },
      );

      expect(bcrypt.hash).toHaveBeenCalledWith('refresh_token_value', 10);
      expect(mockUsersService.update).toHaveBeenCalledWith(user.id, {
        hashedRefreshToken: 'new_hashed_refresh_token',
      });
    });

    it('should throw UnauthorizedException on wrong password', async () => {
      mockUsersService.findBy.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.signIn(user.email, 'wrong_password')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user not found', async () => {
      mockUsersService.findBy.mockResolvedValue(undefined);

      await expect(service.signIn('notfound@mail.ru', 'anypassword')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refreshTokens', () => {
    const user = { id: 1, email: 'john@mail.ru', hashedRefreshToken: 'old_hashed_token' };
    const sub = 1;
    const oldToken = 'old_refresh_token_value';

    it('should generate new access and refresh tokens for given sub and valid token', async () => {
      mockUsersService.findById.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new_hashed_refresh_token');

      mockJwtService.signAsync.mockResolvedValueOnce('new_access_token').mockResolvedValueOnce('new_refresh_token');

      const result = await service.refreshTokens(sub, oldToken);

      expect(result).toEqual({
        access_token: 'new_access_token',
        expiresIn: 900,
        refresh_token: 'new_refresh_token',
      });

      expect(bcrypt.compare).toHaveBeenCalledWith(oldToken, user.hashedRefreshToken);
      expect(mockUsersService.update).toHaveBeenCalledWith(user.id, {
        hashedRefreshToken: 'new_hashed_refresh_token',
      });
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockUsersService.findById.mockResolvedValue(undefined);

      await expect(service.refreshTokens(sub, oldToken)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user has no hashedRefreshToken in DB', async () => {
      mockUsersService.findById.mockResolvedValue({ ...user, hashedRefreshToken: null });

      await expect(service.refreshTokens(sub, oldToken)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if old refresh token is invalid', async () => {
      mockUsersService.findById.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false); // bcrypt.compare вернул false

      await expect(service.refreshTokens(sub, 'invalid_token')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should nullify hashedRefreshToken in DB', async () => {
      const userId = 1;
      await service.logout(userId);

      expect(mockUsersService.update).toHaveBeenCalledWith(userId, {
        hashedRefreshToken: null,
      });
    });
  });
});
