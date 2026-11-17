import { describe, expect, it } from 'vitest';

import { useCharacter } from '@/modules/Game/composables/useCharacter';

describe('character movement boundaries', () => {
  it('rejects a destination outside the walkable map', () => {
    const character = useCharacter(1, 1, 20, 20, (x) => x < 10);

    expect(character.walkTo(15, 1)).toBe(false);
    expect(character.isMoving.value).toBe(false);
  });

  it('stops before crossing a blocked area along the route', () => {
    const character = useCharacter(0, 0, 20, 20, (x) => x < 2 || x >= 3);

    expect(character.walkTo(3, 0)).toBe(true);
    expect(character.update()).toBe(true);
    expect(character.update()).toBe(true);
    expect(character.update()).toBe(true);
    expect(character.update()).toBe(false);
    expect(character.isMoving.value).toBe(false);
  });

  it('completes one logical travel step after moving 80 map units', () => {
    const character = useCharacter(0, 0, 200, 20);
    character.walkTo(100, 0);

    for (let frame = 0; frame < 123; frame++) character.update();
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

  it('uses the speed returned by the terrain resolver', () => {
    const character = useCharacter(
      0,
      0,
      20,
      20,
      () => true,
      (x) => (x < 2 ? 1 : 0.7)
    );
    character.walkTo(10, 0);
    character.update(1000 / 39);
    expect(character.position.x).toBeCloseTo(1);
    character.update(1000 / 39);
    expect(character.position.x).toBeCloseTo(2);
    character.update(1000 / 39);
    expect(character.position.x).toBeCloseTo(2.7);
  });

  it('moves at the same reduced speed on 60 Hz and 120 Hz displays', () => {
    for (const fps of [60, 120]) {
      const character = useCharacter(0, 0, 1000, 100);
      character.walkTo(500, 0);
      for (let frame = 0; frame < fps; frame++) character.update(1000 / fps);
      expect(character.position.x).toBeCloseTo(39);
    }
  });

  it('does not jump forward after a suspended tab resumes', () => {
    const character = useCharacter(0, 0, 1000, 100);
    character.walkTo(500, 0);
    character.update(60000);
    expect(character.position.x).toBeCloseTo(1);
  });
});

describe('interrupted expeditions', () => {
  it('remembers the destination and resumes from the encounter position', () => {
    const c = useCharacter(0, 0, 200, 200);
    c.walkTo(100, 50);
    c.update();
    const position = { ...c.position };
    c.pauseTravel();
    expect(c.interruptedDestination.value).toEqual({ x: 100, y: 50 });
    c.update();
    expect(c.position).toEqual(position);
    expect(c.resumeTravel()).toBe(true);
    for (let i = 0; i < 200; i++) c.update();
    expect(c.position).toEqual({ x: 100, y: 50 });
    expect(c.interruptedDestination.value).toBeNull();
  });
  it('clears the route when cancelled, replaced or respawned', () => {
    const c = useCharacter();
    for (const reset of [() => c.stop(), () => c.walkTo(20, 20), () => c.setPosition(10, 10)]) {
      c.walkTo(100, 100);
      c.pauseTravel();
      reset();
      expect(c.resumeTravel()).toBe(false);
    }
  });
});
