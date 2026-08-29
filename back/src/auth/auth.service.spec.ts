import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
import * as bcrypt from 'bcrypt';
import { ConflictException, BadRequestException } from '@nestjs/common';
import { RegisterDto, Gender } from './register.dto';

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
        { provide: PrismaService, useValue: mockPrismaService },
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

  describe('register', () => {
    it('should register user with required fields and return token', async () => {
      const dto: RegisterDto = {
        email: 'test@example.com',
        password: 'Passw0rd',
        name: 'Test User',
      };

      mockUsersService.findOne.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
      mockPrismaService.user.create.mockResolvedValue({
        id: 1,
        name: dto.name,
        email: dto.email,
        gender: null,
        country: null,
        city: null,
        language: null,
      });
      mockJwtService.signAsync.mockResolvedValue('access_token_value');

      const result = await service.register(dto);

      expect(result.access_token).toBe('access_token_value');
      expect(result.expiresIn).toBe(60);
      expect(result.user.email).toBe(dto.email);
    });

    it('should accept optional fields during registration', async () => {
      const dto: RegisterDto = {
        email: 'test@example.com',
        password: 'Passw0rd',
        name: 'Test User',
        country: 'USA',
        city: 'New York',
        gender: Gender.FEMALE,
        language: 'en-US',
      };

      mockUsersService.findOne.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
      mockPrismaService.user.create.mockResolvedValue({
        id: 1,
        name: dto.name,
        email: dto.email,
        gender: dto.gender,
        country: dto.country,
        city: dto.city,
        language: dto.language,
      });

      const result = await service.register(dto);

      expect(result.user.country).toBe('USA');
      expect(result.user.city).toBe('New York');
      expect(result.user.gender).toBe(Gender.FEMALE);
      expect(result.user.language).toBe('en-US');
    });

    it('should throw ConflictException when email already exists', async () => {
      const dto: RegisterDto = {
        email: 'existing@example.com',
        password: 'Passw0rd',
        name: 'Test User',
      };

      mockUsersService.findOne.mockResolvedValue({ id: 99, email: dto.email });

      await expect(service.register(dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('requestPasswordReset', () => {
    it('should return generic success message even if user not found', async () => {
      mockUsersService.findOne.mockResolvedValue(null);

      const result = await service.requestPasswordReset({ email: 'nonexistent@example.com' });

      expect(result).toEqual({
        message: 'Если аккаунт существует, инструкции для восстановления будут отправлены на email.',
      });
    });

    it('should generate and store a token when user exists', async () => {
      const user = { id: 1, email: 'existing@example.com' };
      mockUsersService.findOne.mockResolvedValue(user);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_token');

      const result = await service.requestPasswordReset({ email: user.email });

      expect(result.message).toContain('инструкции для восстановления');
      expect(mockUsersService.findOne).toHaveBeenCalledWith(user.email);
      expect(mockPrismaService.passwordResetToken.create).toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('should throw BadRequestException when token is invalid', async () => {
      mockPrismaService.passwordResetToken.findMany.mockResolvedValue([]);

      await expect(service.resetPassword({ token: 'invalid_token', password: 'NewPass123!' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reset password when token is valid', async () => {
      const validToken = 'valid_token_123';
      const user = { id: 1, email: 'test@example.com' };
      mockUsersService.findOne.mockResolvedValue(user);

      mockPrismaService.passwordResetToken.findMany.mockResolvedValue([
        {
          id: 1,
          token: 'hashed_token',
          userId: user.id,
          expiresAt: new Date(Date.now() + 5 * 60_000),
          used: false,
          user,
        },
      ]);

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_new_password');
      mockPrismaService.user.update.mockResolvedValue({});
      mockPrismaService.passwordResetToken.update.mockResolvedValue({});

      const result = await service.resetPassword({ token: validToken, password: 'NewPass123!' });

      expect(result.message).toBe('Пароль успешно обновлён.');
      expect(mockPrismaService.user.update).toHaveBeenCalled();
      expect(mockPrismaService.passwordResetToken.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { used: true },
      });
    });

    it('should throw BadRequestException when token is expired', async () => {
      const user = { id: 1, email: 'test@example.com' };
      mockUsersService.findOne.mockResolvedValue(user);

      // Query filters by expiresAt > now, so expired tokens won't be found
      mockPrismaService.passwordResetToken.findMany.mockResolvedValue([]);

      await expect(service.resetPassword({ token: 'valid_token', password: 'NewPass123!' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when token is already used', async () => {
      const user = { id: 1, email: 'test@example.com' };
      mockUsersService.findOne.mockResolvedValue(user);

      // Query filters by used: false, so used tokens won't be found
      mockPrismaService.passwordResetToken.findMany.mockResolvedValue([]);

      await expect(service.resetPassword({ token: 'valid_token', password: 'NewPass123!' })).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
