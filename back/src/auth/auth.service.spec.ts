import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
import * as bcrypt from 'bcrypt';
import type { Prisma } from '../../generated/client';

import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { ItemGeneratorService } from '../items/item-generator.service';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;

  const mockUsersService: {
    findBy: jest.Mock;
    findById: jest.Mock;
    update: jest.Mock;
  } = {
    findBy: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
  };

  const mockJwtService: {
    signAsync: jest.Mock;
  } = {
    signAsync: jest.fn(),
  };

  const mockPrismaService: {
    $transaction: jest.Mock;
    user: {
      create: jest.Mock<Promise<{ id: number; email: string }>, [Prisma.UserCreateArgs]>;
    };
  } = {
    $transaction: jest.fn(),
    user: {
      create: jest.fn<Promise<{ id: number; email: string }>, [Prisma.UserCreateArgs]>(),
    },
  };

  const originalEnv = process.env;
  const itemGenerator = { generate: jest.fn() };

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
    mockPrismaService.$transaction.mockImplementation((operation: (tx: unknown) => unknown) =>
      operation(mockPrismaService),
    );
    itemGenerator.generate.mockReset();
    itemGenerator.generate.mockResolvedValueOnce({ id: 101 }).mockResolvedValueOnce({ id: 102 });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ItemGeneratorService, useValue: itemGenerator },
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
        { expiresIn: 604.8, secret: 'test_secret' },
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

  describe('register', () => {
    it('creates a game profile with starting attributes and properties', async () => {
      mockUsersService.findBy.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValueOnce('hashed_password').mockResolvedValueOnce('hashed_refresh');
      mockPrismaService.user.create.mockResolvedValue({ id: 3, email: 'new@example.com' });
      mockJwtService.signAsync.mockResolvedValueOnce('access_token').mockResolvedValueOnce('refresh_token');

      await service.register('new@example.com', 'Qwerty123!');

      const createData = mockPrismaService.user.create.mock.calls[0][0].data;
      const profile = 'create' in createData.gameProfile! ? createData.gameProfile.create : undefined;
      expect(profile?.gems).toBe(0);
      expect(itemGenerator.generate).toHaveBeenNthCalledWith(
        1,
        { level: 1, rarity: 'COMMON', equipmentType: 'WEAPON' },
        mockPrismaService,
      );
      expect(itemGenerator.generate).toHaveBeenNthCalledWith(
        2,
        { level: 1, rarity: 'COMMON', equipmentType: 'SHIELD' },
        mockPrismaService,
      );
      expect(profile?.inventory?.create).toEqual([
        { item: { connect: { id: 101 } }, quantity: 1, isEquiped: false, slot: null },
        { item: { connect: { id: 102 } }, quantity: 1, isEquiped: false, slot: null },
      ]);
      expect(profile?.freeAttributes).toBe(0);
      expect(profile?.profileAttributes?.create).toHaveLength(5);
      expect(profile?.profileAttributes?.create).toEqual(
        expect.arrayContaining([expect.objectContaining({ value: 5, attribute: { connect: { name: 'STRENGTH' } } })]),
      );
      expect(profile?.profileStats?.create).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ value: 50, stat: { connect: { name: 'HEALTH' } } }),
          expect.objectContaining({ value: 10, stat: { connect: { name: 'MANA' } } }),
          expect.objectContaining({ value: 1, stat: { connect: { name: 'DAMAGE' } } }),
        ]),
      );
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
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

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
