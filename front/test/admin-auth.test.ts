import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('independent admin API authentication', () => {
  const storage = new Map<string, string>();
  const fetchMock = vi.fn();
  beforeEach(() => {
    vi.resetModules(); storage.clear(); fetchMock.mockReset();
    vi.stubGlobal('sessionStorage', { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value), removeItem: (key: string) => storage.delete(key) });
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());
  it('uses a separate token and never sends cookies or the game token', async () => {
    const { adminApi } = await import('../src/modules/Feedback/adminApi');
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ data: { token: 'adm_separate', admin: { id: 1, name: 'Admin' } } }), { status: 200 }));
    await adminApi.login('admin@example.invalid', 'secret');
    expect(fetchMock).toHaveBeenLastCalledWith(expect.stringContaining('/admin/auth/login'), expect.objectContaining({ credentials: 'omit', headers: { 'Content-Type': 'application/json' } }));
    expect(storage.get('fw_admin_token')).toBe('adm_separate');
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ data: { id: 1, name: 'Admin' } }), { status: 200 }));
    await adminApi.me();
    expect(fetchMock).toHaveBeenLastCalledWith(expect.stringContaining('/admin/auth/me'), expect.objectContaining({ headers: { 'Content-Type': 'application/json', Authorization: 'Bearer adm_separate' } }));
  });
  it('expires only the admin session, without calling game refresh', async () => {
    storage.set('fw_admin_token', 'adm_expired');
    storage.set('unrelated', 'keep');
    const { adminApi, adminToken } = await import('../src/modules/Feedback/adminApi');
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ message: 'Admin session expired' }), { status: 401 }));
    await expect(adminApi.me()).rejects.toThrow('Admin session expired');
    expect(adminToken.value).toBeNull();
    expect(storage.has('fw_admin_token')).toBe(false);
    expect(storage.get('unrelated')).toBe('keep');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('revokes server access before removing the local token on logout', async () => {
    storage.set('fw_admin_token', 'adm_active');
    const { adminApi } = await import('../src/modules/Feedback/adminApi');
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ data: { success: true } }), { status: 200 }));
    await adminApi.logout();
    expect(fetchMock).toHaveBeenLastCalledWith(expect.stringContaining('/admin/auth/logout'), expect.objectContaining({ method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer adm_active' } }));
    expect(storage.has('fw_admin_token')).toBe(false);
  });
});
