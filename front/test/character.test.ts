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

  it('completes one logical travel step after moving 80 map units', () => {
    const character = useCharacter(0, 0, 200, 20);
    character.walkTo(100, 0);

    for (let frame = 0; frame < 79; frame++) character.update();
    expect(character.consumeTravelStep()).toBe(false);

    character.update();
    expect(character.consumeTravelStep()).toBe(true);
    expect(character.consumeTravelStep()).toBe(false);
  });

  it('restores a saved position only when it is walkable', () => {
    const character = useCharacter(1, 1, 20, 20, (x) => x < 10);

    expect(character.setPosition(8, 7)).toBe(true);
    expect(character.position).toMatchObject({ x: 8, y: 7 });
    expect(character.setPosition(15, 7)).toBe(false);
    expect(character.position).toMatchObject({ x: 8, y: 7 });
  });
});
