import { Test, TestingModule } from '@nestjs/testing';
import { AuthService, SignInResult } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';

describe('AuthService', () => {
  let service: AuthService;

  const mockUsersService = {
    findOne: jest.fn(),
  };

  const mockJwtService = {
    signAsync: jest.fn(),
  };

  beforeEach(async () => {
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
    it('should return access_token, refresh_token, expiresIn on success', async () => {
      const user = { id: 1, email: 'john@mail.ru', password: 'Qwerty123!' };
      mockUsersService.findOne.mockResolvedValue(user);
      mockJwtService.signAsync
        .mockResolvedValueOnce('access_token_value')
        .mockResolvedValueOnce('refresh_token_value');

      const result: SignInResult = await service.signIn(user.email, user.password);

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
      const user = { id: 1, email: 'john@mail.ru', password: 'Qwerty123!' };
      mockUsersService.findOne.mockResolvedValue(user);

      await expect(
        service.signIn(user.email, 'wrong_password'),
      ).rejects.toThrow();
    });

    it('should throw UnauthorizedException when user not found', async () => {
      mockUsersService.findOne.mockResolvedValue(undefined);

      await expect(
        service.signIn('notfound@mail.ru', 'anypassword'),
      ).rejects.toThrow();
    });
  });
});
