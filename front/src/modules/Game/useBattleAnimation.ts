import { computed, onScopeDispose, ref, watch, type Ref } from 'vue';

import type { BattleState } from '@/modules/Monsters/api';

export function useBattleAnimation(battle: Ref<Pick<BattleState, 'events'>>, mode: Ref<string>) {
  const animationSequence = ref(0);
  const animating = ref(false);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const monsterAttackDelay = computed(() =>
    battle.value.events.some((event) => event.actor === 'PLAYER' && event.action !== 'MOVE') ? 950 : 480
  );
  watch(battle, (next) => {
    // Winning blows retain the server turn number. Restart for each new response.
    animationSequence.value++;
    clearTimeout(timer);
    animating.value = mode.value === 'tactical' && next.events.some((event) => event.action !== 'MOVE');
    if (animating.value) {
      const monsterAttacks = next.events.some((event) => event.actor === 'MONSTER' && event.action !== 'MOVE');
      timer = setTimeout(
        () => {
          animating.value = false;
        },
        monsterAttacks ? monsterAttackDelay.value + 950 : 950
      );
    }
  });
  onScopeDispose(() => clearTimeout(timer));
  return { animationSequence, animating, monsterAttackDelay };
}
