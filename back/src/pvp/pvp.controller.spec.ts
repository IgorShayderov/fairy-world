import { Test, TestingModule } from '@nestjs/testing';
import { AuthGuard } from '../auth/auth.guard';
import { PvpController } from './pvp.controller';
import { PvpService } from './pvp.service';

describe('PvpController', () => {
  let controller: PvpController;

  const mockPvpService = {
    getOpponents: jest.fn(),
    refreshOpponents: jest.fn(),
    duel: jest.fn(),
    resetCooldown: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PvpController],
      providers: [{ provide: PvpService, useValue: mockPvpService }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PvpController>(PvpController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('gets 3 opponent variants for the player', async () => {
    const mockOpponents = [{ id: 'opp-1' }, { id: 'opp-2' }, { id: 'opp-3' }];
    mockPvpService.getOpponents.mockResolvedValue(mockOpponents);

    const result = await controller.getOpponents({ user: { sub: 42 } } as never);

    expect(result).toBe(mockOpponents);
    expect(mockPvpService.getOpponents).toHaveBeenCalledWith(42);
  });

  it('refreshes opponents for the player', async () => {
    const mockOpponents = [{ id: 'opp-4' }, { id: 'opp-5' }, { id: 'opp-6' }];
    mockPvpService.refreshOpponents.mockResolvedValue(mockOpponents);

    const result = await controller.refreshOpponents({ user: { sub: 42 } } as never);

    expect(result).toBe(mockOpponents);
    expect(mockPvpService.refreshOpponents).toHaveBeenCalledWith(42);
  });

  it('initiates a duel with the selected opponent', async () => {
    const mockResult = { id: 'battle-1', status: 'VICTORY' };
    mockPvpService.duel.mockResolvedValue(mockResult);

    const result = await controller.duel({ user: { sub: 42 } } as never, { opponentId: 'opp-1' });

    expect(result).toBe(mockResult);
    expect(mockPvpService.duel).toHaveBeenCalledWith(42, 'opp-1');
  });

  it('resets attack cooldown', async () => {
    const mockReset = { success: true, pvpCooldownUntil: null };
    mockPvpService.resetCooldown.mockResolvedValue(mockReset);

    const result = await controller.resetCooldown({ user: { sub: 42 } } as never);

    expect(result).toBe(mockReset);
    expect(mockPvpService.resetCooldown).toHaveBeenCalledWith(42);
  });
});
