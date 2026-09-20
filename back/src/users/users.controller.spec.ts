import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AuthGuard } from '../auth/auth.guard';

describe('UsersController', () => {
  let controller: UsersController;

  const mockUsersService = {
    findCurrentUser: jest.fn(),
    allocateAttribute: jest.fn(),
    consumeInventoryItem: jest.fn(),
    updateMapPosition: jest.fn(),
    getLeaderboard: jest.fn(),
    dropInventoryItem: jest.fn(),
    replaceInventoryItem: jest.fn(),
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
        gameProfile: { gold: 100, gems: 12, experience: 5, level: 2, inventory: [] },
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
        gems: 12,
        experience: 5,
        level: 2,
        freeAttributes: 0,
        mapPosition: { x: 1470, y: 1040 },
        inventory: [],
        equippedItems: [],
      });
      expect(result.attributes).toHaveLength(5);
      expect(result.attributes.every(({ baseValue, value }) => baseValue === 5 && value === 5)).toBe(true);
      expect(result.properties).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'HEALTH', baseValue: 60, attributeBonus: 75, value: 135 }),
          expect.objectContaining({ name: 'MANA', baseValue: 15, attributeBonus: 25, value: 40 }),
          expect.objectContaining({ name: 'DAMAGE', baseValue: 1, attributeBonus: 5, value: 6 }),
        ]),
      );
    });
  });

  it('allocates an attribute point for the authenticated player', async () => {
    const dto = { attribute: 'STRENGTH' as const, amount: 1 };
    mockUsersService.allocateAttribute.mockResolvedValue({ success: true, attribute: 'STRENGTH', value: 6 });

    await expect(controller.allocateAttribute({ user: { sub: 7 } } as never, dto)).resolves.toEqual({
      success: true,
      attribute: 'STRENGTH',
      value: 6,
    });
    expect(mockUsersService.allocateAttribute).toHaveBeenCalledWith(7, dto);
  });

  it('consumes an inventory item for the authenticated player', async () => {
    mockUsersService.consumeInventoryItem.mockResolvedValue({ success: true });

    await expect(controller.consumeInventoryItem({ user: { sub: 7 } } as never, 14)).resolves.toEqual({
      success: true,
    });
    expect(mockUsersService.consumeInventoryItem).toHaveBeenCalledWith(7, 14);
  });

  it('updates the authenticated player map position', async () => {
    const position = { x: 1550.25, y: 980.5 };
    mockUsersService.updateMapPosition.mockResolvedValue(position);

    await expect(controller.updateMapPosition({ user: { sub: 7 } } as never, position)).resolves.toEqual(position);
    expect(mockUsersService.updateMapPosition).toHaveBeenCalledWith(7, position);
  });

  it('returns the player leaderboard', async () => {
    const leaderboard = [{ rank: 1, name: 'Alice', level: 10, killedMonsters: 15, questsCompleted: 3 }];
    mockUsersService.getLeaderboard.mockResolvedValue(leaderboard);

    await expect(controller.getLeaderboard({ user: { sub: 7 } } as never)).resolves.toEqual(leaderboard);
    expect(mockUsersService.getLeaderboard).toHaveBeenCalledWith(7);
  });

  it('drops an inventory item for the authenticated player', async () => {
    mockUsersService.dropInventoryItem.mockResolvedValue({ success: true });

    await expect(controller.dropInventoryItem({ user: { sub: 7 } } as never, 14)).resolves.toEqual({
      success: true,
    });
    expect(mockUsersService.dropInventoryItem).toHaveBeenCalledWith(7, 14);
  });

  it('replaces an inventory item for the authenticated player', async () => {
    const dto = { replaceInventoryItemId: 10, newItemId: 42 };
    mockUsersService.replaceInventoryItem.mockResolvedValue({ success: true, inventoryItemId: 99 });

    await expect(controller.replaceInventoryItem({ user: { sub: 7 } } as never, dto)).resolves.toEqual({
      success: true,
      inventoryItemId: 99,
    });
    expect(mockUsersService.replaceInventoryItem).toHaveBeenCalledWith(7, dto);
  });
});
