import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

import { usersApi } from '@/modules/Auth/api/users';
import { useCurrentUserStore } from '@/modules/Auth/store/currentUser';

export const ONBOARDING_STEPS = 6;
export const useOnboardingStore = defineStore('onboarding', () => {
  const currentUser = useCurrentUserStore();
  const open = ref(false);
  const step = ref(0);
  const replay = ref(false);
  const pending = ref(false);
  const failed = ref(false);
  let initializedFor: number | null = null;
  let generation = 0;

  watch(
    () => currentUser.user?.id,
    () => {
      generation++;
      initializedFor = null;
      open.value = false;
      step.value = 0;
      replay.value = false;
      pending.value = false;
      failed.value = false;
    },
    { immediate: true, flush: 'sync' }
  );

  watch(
    () => [currentUser.user?.onboarding, currentUser.user?.hasActiveDungeon],
    () => {
      const user = currentUser.user;
      if (!user?.onboarding || user.hasActiveDungeon || initializedFor === user.id) return;
      initializedFor = user.id;
      if (!user.onboarding.completed) {
        step.value = Math.max(0, Math.min(ONBOARDING_STEPS - 1, user.onboarding.step));
        open.value = true;
      }
    },
    { immediate: true }
  );

  function restart() {
    if (!currentUser.user || pending.value) return;
    initializedFor = currentUser.user.id;
    // An unfinished guide still saves progress; completed accounts can replay without changing their state.
    replay.value = !!currentUser.user.onboarding?.completed;
    step.value = 0;
    failed.value = false;
    open.value = true;
  }

  async function save(next: number, completed = false): Promise<boolean> {
    const user = currentUser.user;
    if (!user || pending.value) return false;
    const target = Math.max(0, Math.min(ONBOARDING_STEPS - 1, next));
    failed.value = false;
    if (replay.value) {
      step.value = target;
      if (completed) open.value = false;
      return true;
    }
    const requestGeneration = generation;
    pending.value = true;
    try {
      const state = await usersApi.updateOnboarding({ step: target, completed });
      if (generation !== requestGeneration || currentUser.user?.id !== user.id) return false;
      currentUser.user.onboarding = state;
      step.value = target;
      if (completed) open.value = false;
      return true;
    } catch {
      if (generation === requestGeneration) failed.value = true;
      return false;
    } finally {
      if (generation === requestGeneration) pending.value = false;
    }
  }

  return {
    open,
    step,
    replay,
    pending,
    failed,
    restart,
    dismissForSession: () => {
      if (!pending.value) {
        open.value = false;
        failed.value = false;
      }
    },
    next: () => save(step.value + 1),
    back: () => save(step.value - 1),
    finish: () => save(step.value, true),
  };
});
