import { describe, expect, it, vi } from 'vitest';

import en from '@/locales/en/modules';
import ru from '@/locales/ru/modules';
import { clansApi } from '@/modules/Clans/api';
import routes from '@/routes';
import { api } from '@/shared/api';

describe('clan module', () => {
  it('defines clan page and API routes', () => {
    expect(routes.clansPath()).toBe('/clans');
    expect(routes.api.clans.mePath()).toContain('/api/v1/clans/me');
    expect(routes.api.clans.joinPath('abc')).toContain('/api/v1/clans/abc/join');
    expect(routes.api.clans.buyBannerPath('IRON_OATH')).toContain('/api/v1/clans/shop/IRON_OATH/buy');
  });

  it('uses the clan endpoints', async () => {
    vi.spyOn(api, 'get').mockResolvedValueOnce({ data: { clan: null, minLevel: 10, eligible: true } } as never);
    expect(await clansApi.getMine()).toEqual({ clan: null, minLevel: 10, eligible: true });
    expect(api.get).toHaveBeenCalledWith(routes.api.clans.mePath());

    vi.spyOn(api, 'post').mockResolvedValueOnce({ data: { id: 'clan-1' } } as never);
    await clansApi.create({ name: 'Moon Guard', tag: 'MOON', description: '' });
    expect(api.post).toHaveBeenCalledWith(routes.api.clans.createPath(), {
      name: 'Moon Guard',
      tag: 'MOON',
      description: '',
    });
  });

  it('includes English and Russian clan navigation', () => {
    expect(en.menu.clans).toBe('Clans');
    expect(ru.menu.clans).toBe('Кланы');
    expect(en.clans.lockedTitle).toContain('{{level}}');
    expect(ru.clans.lockedTitle).toContain('{{level}}');
  });
});
