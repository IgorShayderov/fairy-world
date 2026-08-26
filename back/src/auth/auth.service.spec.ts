import { Test, TestingModule } from '@nestjs/testing';
import { AuthService, SignInResult } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
import * as bcrypt from 'bcrypt';
import { ConflictException, BadRequestException } from '@nestjs/common';
import { RegisterDto, Gender } from './register.dto';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;

  const mockUsersService = {
    findOne: jest.fn(),
  };
  const mockJwtService = {
    signAsync: jest.fn(),
  };
  const mockPrismaService = {
    user: {
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.resetAllMocks();

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
    it('should return access_token, refresh_token, expiresIn on success', async () => {
      const user = { id: 1, email: 'john@mail.ru', password: 'hashed_password' };
      mockUsersService.findOne.mockResolvedValue(user);

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      mockJwtService.signAsync.mockResolvedValueOnce('access_token_value').mockResolvedValueOnce('refresh_token_value');

      const result: SignInResult = await service.signIn(user.email, 'Qwerty123!');

      expect(result).toEqual({
        access_token: 'access_token_value',
        refresh_token: 'refresh_token_value',
        expiresIn: 60,
      });
      expect(mockJwtService.signAsync).toHaveBeenCalledTimes(2);
      expect(mockJwtService.signAsync).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ sub: 1, email: 'john@mail.ru' }),
        expect.objectContaining({ expiresIn: '60s' }),
      );
      expect(mockJwtService.signAsync).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ sub: 1, type: 'refresh' }),
        expect.objectContaining({ expiresIn: '7d' }),
      );
    });

    it('should throw UnauthorizedException on wrong password', async () => {
      const user = { id: 1, email: 'john@mail.ru', password: 'hashed_password' };
      mockUsersService.findOne.mockResolvedValue(user);

      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.signIn(user.email, 'wrong_password')).rejects.toThrow();
    });

    it('should throw UnauthorizedException when user not found', async () => {
      mockUsersService.findOne.mockResolvedValue(undefined);

      await expect(service.signIn('notfound@mail.ru', 'anypassword')).rejects.toThrow();
    });
  });

  describe('refreshTokens', () => {
    it('should generate new access and refresh tokens for given sub', async () => {
      const sub = 1;
      mockJwtService.signAsync.mockResolvedValueOnce('new_access_token').mockResolvedValueOnce('new_refresh_token');

      const result = await service.refreshTokens(sub);

      expect(result).toEqual({
        access_token: 'new_access_token',
        expiresIn: 60,
        refresh_token: 'new_refresh_token',
      });
      expect(mockJwtService.signAsync).toHaveBeenCalledWith({ sub }, expect.objectContaining({ expiresIn: '60s' }));
      expect(mockJwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({ sub, type: 'refresh' }),
        expect.objectContaining({ expiresIn: '7d' }),
      );
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

      const result = await service.requestPasswordReset({ email: user.email });

      expect(result.message).toContain('инструкции для восстановления');
      expect(mockUsersService.findOne).toHaveBeenCalledWith(user.email);
    });
  });

  describe('resetPassword', () => {
    it('should throw BadRequestException when token is invalid', async () => {
      await expect(service.resetPassword({ token: 'invalid_token', password: 'NewPass123!' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reset password when token is valid', async () => {
      // Set up a valid token manually
      const validToken = 'valid_token_123';
      const user = { id: 1, email: 'test@example.com' };
      mockUsersService.findOne.mockResolvedValue(user);

      // Simulate creating a valid token using a type-cast helper
      const authServiceAny = service as unknown as {
        resetTokens: Map<string, { userId: number; expiresAt: Date }>;
      };
      authServiceAny.resetTokens.set(validToken, {
        userId: user.id,
        expiresAt: new Date(Date.now() + 5 * 60_000), // 5 min in future
      });

      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_new_password');
      mockPrismaService.user.update.mockResolvedValue({});

      const result = await service.resetPassword({ token: validToken, password: 'NewPass123!' });

      expect(result.message).toBe('Пароль успешно обновлён.');
      expect(mockPrismaService.user.update).toHaveBeenCalled();
    });
  });
});
