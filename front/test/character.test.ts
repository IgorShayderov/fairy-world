import { describe, expect, it } from 'vitest';

import { useCharacter } from '@/modules/Game/composables/useCharacter';

describe('character movement boundaries', () => {
  it('rejects a destination outside the walkable map', () => {
    const character = useCharacter(1, 1, 20, 20, (x) => x < 10);

    expect(character.walkTo(15, 1)).toBe(false);
    expect(character.isMoving.value).toBe(false);
  });

  it('stops before crossing a blocked area along the route', () => {
    const character = useCharacter(0, 0, 20, 20, (x) => x !== 2);

    expect(character.walkTo(3, 0)).toBe(true);
    expect(character.update()).toBe(true);
    expect(character.update()).toBe(false);
    expect(character.isMoving.value).toBe(false);
  });
});
