import { describe, expect, it } from 'vitest';

import { getBattleEventSubject } from '@/modules/Game/battleEvent';

describe('battle event presentation', () => {
  it('shows the defender as the one who dodged', () => {
    expect(
      getBattleEventSubject({ actor: 'PLAYER', damage: 0, critical: false, dodged: true }),
    ).toBe('enemy');
    expect(
      getBattleEventSubject({ actor: 'MONSTER', damage: 0, critical: false, dodged: true }),
    ).toBe('you');
  });

  it('shows the attacker as the one who landed a hit', () => {
    expect(
      getBattleEventSubject({ actor: 'PLAYER', damage: 10, critical: false, dodged: false }),
    ).toBe('you');
    expect(
      getBattleEventSubject({ actor: 'MONSTER', damage: 10, critical: false, dodged: false }),
    ).toBe('enemy');
  });
});
