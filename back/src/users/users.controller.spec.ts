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
        equippedItems: [],
        attributes: [
          { name: 'STRENGTH', description: null, baseValue: 0, equipmentBonus: 0, value: 0 },
          { name: 'AGILITY', description: null, baseValue: 0, equipmentBonus: 0, value: 0 },
          { name: 'ENDURANCE', description: null, baseValue: 0, equipmentBonus: 0, value: 0 },
          { name: 'WISDOM', description: null, baseValue: 0, equipmentBonus: 0, value: 0 },
          { name: 'CHARISMA', description: null, baseValue: 0, equipmentBonus: 0, value: 0 },
        ],
        properties: [
          { name: 'HEALTH', description: null, baseValue: 0, equipmentBonus: 0, value: 0 },
          { name: 'MANA', description: null, baseValue: 0, equipmentBonus: 0, value: 0 },
          { name: 'DAMAGE', description: null, baseValue: 0, equipmentBonus: 0, value: 0 },
          { name: 'DEFENSE', description: null, baseValue: 0, equipmentBonus: 0, value: 0 },
          { name: 'CRIT', description: null, baseValue: 0, equipmentBonus: 0, value: 0 },
          { name: 'DODGE', description: null, baseValue: 0, equipmentBonus: 0, value: 0 },
          { name: 'CRIT_DAMAGE', description: null, baseValue: 0, equipmentBonus: 0, value: 0 },
        ],
      });
    });
  });
});
