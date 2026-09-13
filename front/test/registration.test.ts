import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock('@shared/api', () => ({ api: { post: mocks.post } }));

import { signUp } from '@/modules/Auth/api';
import routes from '@/routes';

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('registration', () => {
  it('uses the registration endpoint and stores the new session', async () => {
    const setItem = vi.fn();
    vi.stubGlobal('localStorage', { setItem });
    vi.spyOn(Date, 'now').mockReturnValue(1000);
    mocks.post.mockResolvedValue({ data: { access_token: 'test-token', expiresIn: 60 } });
    const credentials = { email: 'player@example.com', password: 'FairyWorld2026!Hero' };
    await signUp(credentials);
    expect(mocks.post).toHaveBeenCalledWith(routes.api.auth.signUpPath(), credentials);
    expect(setItem).toHaveBeenCalledWith('access_token', 'test-token');
    expect(setItem).toHaveBeenCalledWith('access_token_expires_at', '61000');
  });
  it('does not save a session when registration fails', async () => {
    const setItem = vi.fn();
    vi.stubGlobal('localStorage', { setItem });
    mocks.post.mockRejectedValue(new Error('Registration failed'));
    await expect(signUp({ email: 'player@example.com', password: 'FairyWorld2026!Hero' })).rejects.toThrow();
    expect(setItem).not.toHaveBeenCalled();
  });
});
