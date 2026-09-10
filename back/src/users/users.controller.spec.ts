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
      expect(result).toMatchObject({
        id: 7,
        name: 'Player',
        email: 'me@example.com',
        createdAt: now,
        updatedAt: now,
        gold: 100,
        experience: 5,
        level: 2,
        freeAttributes: 0,
        inventory: [],
        equippedItems: [],
      });
      expect(result.attributes).toHaveLength(5);
      expect(result.attributes.every(({ baseValue, value }) => baseValue === 5 && value === 5)).toBe(true);
      expect(result.properties).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'HEALTH', baseValue: 50, attributeBonus: 50, value: 100 }),
          expect.objectContaining({ name: 'MANA', baseValue: 10, attributeBonus: 25, value: 35 }),
          expect.objectContaining({ name: 'DAMAGE', baseValue: 1, attributeBonus: 5, value: 6 }),
        ]),
      );
    });
  });
});
