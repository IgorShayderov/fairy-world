import { afterEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, ref } from 'vue';

import { useBattleAnimation } from '@/modules/Game/useBattleAnimation';
import type { BattleState } from '@/modules/Monsters/api';

const hit = (actor: 'PLAYER' | 'MONSTER'): BattleState['events'][number] => ({
  actor,
  damage: 10,
  critical: false,
  dodged: false,
});

describe('battle animation lifecycle', () => {
  afterEach(() => vi.useRealTimers());

  it('replays a winning strike even when the server turn does not advance', async () => {
    vi.useFakeTimers();
    const scope = effectScope();
    const battle = ref({ turn: 4, status: 'ACTIVE', events: [hit('PLAYER')] });
    const animation = scope.run(() => useBattleAnimation(battle, ref('tactical')))!;
    battle.value = { turn: 4, status: 'VICTORY', events: [hit('PLAYER')] };
    await nextTick();
    expect(animation.animationSequence.value).toBe(1);
    expect(animation.animating.value).toBe(true);
    vi.advanceTimersByTime(949);
    expect(animation.animating.value).toBe(true);
    vi.advanceTimersByTime(1);
    expect(animation.animating.value).toBe(false);
    scope.stop();
  });

  it('keeps controls locked through the delayed monster response', async () => {
    vi.useFakeTimers();
    const scope = effectScope();
    const battle = ref({ events: [] as BattleState['events'] });
    const animation = scope.run(() => useBattleAnimation(battle, ref('tactical')))!;
    battle.value = { events: [hit('PLAYER'), hit('MONSTER')] };
    await nextTick();
    expect(animation.monsterAttackDelay.value).toBe(950);
    vi.advanceTimersByTime(950);
    expect(animation.animating.value).toBe(true);
    vi.advanceTimersByTime(950);
    expect(animation.animating.value).toBe(false);
    scope.stop();
  });

  it('does not delay quick battle rewards', async () => {
    const scope = effectScope();
    const battle = ref({ events: [] as BattleState['events'] });
    const animation = scope.run(() => useBattleAnimation(battle, ref('quick')))!;
    battle.value = { events: [hit('PLAYER')] };
    await nextTick();
    expect(animation.animating.value).toBe(false);
    scope.stop();
  });
});
