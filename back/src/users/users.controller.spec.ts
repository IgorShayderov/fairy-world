import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AuthGuard } from '../auth/auth.guard';

describe('UsersController', () => {
  let controller: UsersController;

  const mockUsersService = {
    findCurrentUser: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockUsersService }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getCurrentUser', () => {
    it('should return the user identified by the token subject', async () => {
      const req = { user: { sub: 7, email: 'me@example.com' } };
      const now = new Date();
      const expectedUser = {
        id: 7,
        name: 'Player',
        email: 'me@example.com',
        createdAt: now,
        updatedAt: now,
        gameProfile: { gold: 100, experience: 5, level: 2, inventory: [] },
      };
      mockUsersService.findCurrentUser.mockResolvedValue(expectedUser);

      const result = await controller.getCurrentUser(req as never);

      expect(mockUsersService.findCurrentUser).toHaveBeenCalledWith(7);
      expect(result).toEqual({
        id: 7,
        name: 'Player',
        email: 'me@example.com',
        createdAt: now,
        updatedAt: now,
        gold: 100,
        experience: 5,
        level: 2,
        inventory: [],
      });
    });
  });
});
