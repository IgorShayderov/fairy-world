import { describe, expect, it, vi } from 'vitest';

import en from '@/locales/en/modules';
import ru from '@/locales/ru/modules';
import { pvpApi } from '@/modules/Pvp/api';
import routes from '@/routes';
import { api } from '@/shared/api';

describe('PvP module and routes', () => {
  it('defines correct frontend and api route paths', () => {
    expect(routes.pvpPath()).toBe('/pvp');
    expect(routes.api.pvp.opponentsPath()).toContain('/api/v1/pvp/opponents');
    expect(routes.api.pvp.refreshOpponentsPath()).toContain('/api/v1/pvp/opponents/refresh');
    expect(routes.api.pvp.duelPath()).toContain('/api/v1/pvp/duel');
    expect(routes.api.pvp.resetCooldownPath()).toContain('/api/v1/pvp/cooldown/reset');
  });

  it('calls correct endpoints in pvpApi', async () => {
    const mockOpponents = [{ id: 'opp-easy-1', name: 'Bot Novice', difficulty: 'EASY' }];
    const mockDuelResult = { id: 'duel-1', status: 'VICTORY', turn: 3 };
    const mockReset = { success: true, pvpCooldownUntil: null };

    vi.spyOn(api, 'get').mockResolvedValueOnce({ data: mockOpponents, meta: {} } as never);
    const opponents = await pvpApi.getOpponents();
    expect(opponents).toEqual(mockOpponents);
    expect(api.get).toHaveBeenCalledWith(routes.api.pvp.opponentsPath());

    vi.spyOn(api, 'post').mockResolvedValueOnce({ data: mockOpponents, meta: {} } as never);
    const refreshed = await pvpApi.refreshOpponents();
    expect(refreshed).toEqual(mockOpponents);
    expect(api.post).toHaveBeenCalledWith(routes.api.pvp.refreshOpponentsPath());

    vi.spyOn(api, 'post').mockResolvedValueOnce({ data: mockDuelResult, meta: {} } as never);
    const duelRes = await pvpApi.duel('opp-easy-1');
    expect(duelRes).toEqual(mockDuelResult);
    expect(api.post).toHaveBeenCalledWith(routes.api.pvp.duelPath(), { opponentId: 'opp-easy-1' });

    vi.spyOn(api, 'post').mockResolvedValueOnce({ data: mockReset, meta: {} } as never);
    const resetRes = await pvpApi.resetCooldown();
    expect(resetRes).toEqual(mockReset);
    expect(api.post).toHaveBeenCalledWith(routes.api.pvp.resetCooldownPath());
  });

  it('includes complete English and Russian localization for PvP and menu item', () => {
    expect(en.menu.pvp).toBe('PvP Arena');
    expect(ru.menu.pvp).toBe('PvP Арена');

    expect(en.pvp.title).toBe('PvP Arena');
    expect(ru.pvp.title).toBe('PvP Арена');

    expect(en.pvp.easy).toBe('Novice');
    expect(en.pvp.medium).toBe('Challenger');
    expect(en.pvp.hard).toBe('Master');

    expect(ru.pvp.easy).toBe('Новичок');
    expect(ru.pvp.medium).toBe('Соперник');
    expect(ru.pvp.hard).toBe('Мастер');

    expect(en.pvp.duel).toBe('Attack');
    expect(ru.pvp.duel).toBe('Атаковать');
    expect(en.pvp.coinsOfHonour).toBe('Coins of Honour');
    expect(ru.pvp.coinsOfHonour).toBe('Монеты чести');
    expect(en.pvp.victory).toBe('Victory!');
    expect(ru.pvp.victory).toBe('Победа!');
    expect(en.pvp.defeat).toBe('Defeat');
    expect(ru.pvp.defeat).toBe('Поражение');
  });
});
