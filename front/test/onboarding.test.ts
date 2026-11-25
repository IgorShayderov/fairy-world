import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';

const { updateOnboarding } = vi.hoisted(() => ({ updateOnboarding: vi.fn() }));
vi.mock('@/modules/Auth/api/users', () => ({ usersApi: { updateOnboarding } }));

import type { CurrentUser } from '@/modules/Auth/api/users';
import { useCurrentUserStore } from '@/modules/Auth/store/currentUser';
import { useOnboardingStore } from '@/modules/Onboarding/store';

const player = (id: number, onboarding?: { step: number; completed: boolean }, hasActiveDungeon = false) =>
  ({ id, onboarding, hasActiveDungeon }) as CurrentUser;

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

describe('new-player onboarding lifecycle', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    updateOnboarding.mockReset();
    updateOnboarding.mockImplementation(async (state: { step: number; completed: boolean }) => state);
  });
  afterEach(() => {
    useOnboardingStore().$dispose();
    useCurrentUserStore().$dispose();
  });

  it('opens a new account at its saved step when the profile arrives', async () => {
    const guide = useOnboardingStore();
    expect(guide.open).toBe(false);
    useCurrentUserStore().user = player(1, { step: 3, completed: false });
    await nextTick();
    expect(guide.open).toBe(true);
    expect(guide.step).toBe(3);
    expect(updateOnboarding).not.toHaveBeenCalled();
  });

  it.each([undefined, { step: 5, completed: true }])(
    'does not interrupt existing users with state %j',
    async (state) => {
      useCurrentUserStore().user = player(1, state);
      const guide = useOnboardingStore();
      await nextTick();
      expect(guide.open).toBe(false);
    }
  );

  it('waits until an active dungeon has ended', async () => {
    const user = useCurrentUserStore();
    user.user = player(1, { step: 2, completed: false }, true);
    const guide = useOnboardingStore();
    expect(guide.open).toBe(false);
    user.user.hasActiveDungeon = false;
    await nextTick();
    expect(guide.open).toBe(true);
    expect(guide.step).toBe(2);
  });

  it.each([0, 5])('persists dismissal from step %i for both Skip and Finish', async (step) => {
    const user = useCurrentUserStore();
    user.user = player(1, { step, completed: false });
    const guide = useOnboardingStore();
    expect(await guide.finish()).toBe(true);
    expect(updateOnboarding).toHaveBeenCalledExactlyOnceWith({ step, completed: true });
    expect(user.user.onboarding).toEqual({ step, completed: true });
    expect(guide.open).toBe(false);
    // A normal profile refresh must not reopen the dismissed guide.
    user.user = player(1, { step, completed: true });
    await nextTick();
    expect(guide.open).toBe(false);
  });

  it('replays a completed guide without writing or resetting its saved state', async () => {
    const user = useCurrentUserStore();
    user.user = player(1, { step: 5, completed: true });
    const guide = useOnboardingStore();
    guide.restart();
    expect(guide.open).toBe(true);
    expect(guide.step).toBe(0);
    expect(guide.replay).toBe(true);
    await guide.next();
    expect(guide.step).toBe(1);
    await guide.back();
    expect(guide.step).toBe(0);
    await guide.finish();
    expect(guide.open).toBe(false);
    expect(user.user.onboarding).toEqual({ step: 5, completed: true });
    expect(updateOnboarding).not.toHaveBeenCalled();
  });

  it('keeps the current step open after a failed save and allows retry', async () => {
    const user = useCurrentUserStore();
    user.user = player(1, { step: 2, completed: false });
    const guide = useOnboardingStore();
    updateOnboarding.mockRejectedValueOnce(new Error('offline'));
    expect(await guide.next()).toBe(false);
    expect(guide.step).toBe(2);
    expect(guide.open).toBe(true);
    expect(guide.failed).toBe(true);
    expect(guide.pending).toBe(false);
    expect(user.user.onboarding).toEqual({ step: 2, completed: false });
    expect(await guide.next()).toBe(true);
    expect(guide.step).toBe(3);
    expect(guide.failed).toBe(false);
  });

  it('blocks repeated navigation and dismissal while a save is pending', async () => {
    useCurrentUserStore().user = player(1, { step: 0, completed: false });
    const guide = useOnboardingStore();
    const request = deferred<{ step: number; completed: boolean }>();
    updateOnboarding.mockReturnValueOnce(request.promise);
    const first = guide.next();
    expect(guide.pending).toBe(true);
    expect(await guide.next()).toBe(false);
    expect(await guide.finish()).toBe(false);
    expect(updateOnboarding).toHaveBeenCalledTimes(1);
    request.resolve({ step: 1, completed: false });
    expect(await first).toBe(true);
    expect(guide.step).toBe(1);
    expect(guide.pending).toBe(false);
  });

  it('ignores a late response after switching accounts, including the new pending flag', async () => {
    const user = useCurrentUserStore();
    user.user = player(1, { step: 0, completed: false });
    const guide = useOnboardingStore();
    const oldRequest = deferred<{ step: number; completed: boolean }>();
    const newRequest = deferred<{ step: number; completed: boolean }>();
    updateOnboarding.mockReturnValueOnce(oldRequest.promise).mockReturnValueOnce(newRequest.promise);
    const oldSave = guide.next();
    user.user = player(2, { step: 3, completed: false });
    await nextTick();
    expect(guide.step).toBe(3);
    const newSave = guide.next();
    oldRequest.resolve({ step: 1, completed: false });
    expect(await oldSave).toBe(false);
    expect(user.user.onboarding).toEqual({ step: 3, completed: false });
    expect(guide.step).toBe(3);
    expect(guide.pending).toBe(true);
    newRequest.resolve({ step: 4, completed: false });
    expect(await newSave).toBe(true);
    expect(user.user.onboarding).toEqual({ step: 4, completed: false });
    expect(guide.pending).toBe(false);
  });

  it('ignores a late failure after logout', async () => {
    const user = useCurrentUserStore();
    user.user = player(1, { step: 0, completed: false });
    const guide = useOnboardingStore();
    const request = deferred<{ step: number; completed: boolean }>();
    updateOnboarding.mockReturnValueOnce(request.promise);
    const save = guide.finish();
    user.reset();
    request.reject(new Error('session ended'));
    expect(await save).toBe(false);
    expect(guide.failed).toBe(false);
    expect(guide.pending).toBe(false);
    expect(guide.open).toBe(false);
  });
});
