import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock('@modules/Auth/api', () => ({ refresh }));
import { api } from '../src/shared/api';
import { HttpError } from '../src/shared/api/HttpError';

describe('API request lifecycle', () => {
  const fetchMock = vi.fn();
  let storage: Map<string, string>;
  beforeEach(() => {
    vi.clearAllMocks();
    storage = new Map([['access_token', 'current'], ['access_token_expires_at', 'future']]);
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      removeItem: (key: string) => storage.delete(key),
    });
    vi.stubGlobal('window', { location: { pathname: '/profile', href: '/profile' } });
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('does not log out when a retry fails after a successful refresh', async () => {
    refresh.mockResolvedValue({});
    fetchMock.mockResolvedValueOnce(new Response('', { status: 401 }))
      .mockResolvedValueOnce(new Response('', { status: 500 }));
    await expect(api.get('/private')).rejects.toMatchObject({ status: 500 });
    expect(storage.get('access_token')).toBe('current');
    expect(window.location.href).toBe('/profile');
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('coalesces simultaneous 401 responses into one refresh', async () => {
    let release!: () => void;
    refresh.mockImplementation(() => new Promise<void>((resolve) => { release = resolve; }));
    fetchMock.mockResolvedValueOnce(new Response('', { status: 401 }))
      .mockResolvedValueOnce(new Response('', { status: 401 }))
      .mockImplementation(() => Promise.resolve(new Response(null, { status: 204 })));
    const first = api.get('/first');
    const second = api.get('/second');
    await vi.waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    release();
    await Promise.all([first, second]);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it.each([401, 503])('only clears credentials on a rejected refresh, not an outage (%s)', async (status) => {
    refresh.mockRejectedValue(new HttpError('refresh failed', status));
    fetchMock.mockResolvedValue(new Response('', { status: 401 }));
    await expect(api.get('/private')).rejects.toMatchObject({ status });
    expect(storage.has('access_token')).toBe(status !== 401);
  });

  it('preserves custom Headers and defaults', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await api.get('/private', { headers: new Headers({ 'X-Test': 'yes' }) });
    const options = fetchMock.mock.calls[0]![1] as RequestInit;
    const headers = new Headers(options.headers);
    expect(headers.get('X-Test')).toBe('yes');
    expect(headers.get('Accept')).toBe('application/json');
    expect(headers.get('Authorization')).toBe('Bearer current');
  });

  it('reuses a refreshed token when an older request returns 401 late', async () => {
    fetchMock.mockImplementationOnce(() => {
      storage.set('access_token', 'newer');
      return Promise.resolve(new Response('', { status: 401 }));
    }).mockResolvedValueOnce(new Response(null, { status: 204 }));
    await api.get('/late');
    expect(refresh).not.toHaveBeenCalled();
    expect(new Headers((fetchMock.mock.calls[1]![1] as RequestInit).headers).get('Authorization')).toBe('Bearer newer');
  });

  it('does not rotate twice when another tab refreshed while waiting for the browser lock', async () => {
    const request = vi.fn((_name: string, callback: () => unknown) => {
      storage.set('access_token', 'another-tab-token');
      return Promise.resolve(callback());
    });
    vi.stubGlobal('navigator', { locks: { request } });
    fetchMock.mockResolvedValueOnce(new Response('', { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    await api.get('/private');
    expect(request).toHaveBeenCalledTimes(1);
    expect(refresh).not.toHaveBeenCalled();
  });

  it('forwards caller cancellation', async () => {
    const controller = new AbortController();
    fetchMock.mockImplementation((_url: string, options: RequestInit) => new Promise((_resolve, reject) => {
      options.signal!.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    }));
    const result = api.get('/slow', { signal: controller.signal });
    const assertion = expect(result).rejects.toMatchObject({ name: 'AbortError' });
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    controller.abort();
    await assertion;
    expect(refresh).not.toHaveBeenCalled();
  });
});
