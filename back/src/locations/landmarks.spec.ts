import { requireLandmark } from './landmarks';

describe('northern landmarks', () => {
  it.each([
    ['ICEVAULT', 1770, 300],
    ['RAVENCRYPT', 450, 350],
  ] as const)('allows entering %s only at its position', (name, x, y) => {
    expect(requireLandmark(name, 'dungeon', { mapPositionX: x, mapPositionY: y })).toMatchObject({ x, y });
    expect(() => requireLandmark(name, 'dungeon', { mapPositionX: 1470, mapPositionY: 1040 })).toThrow();
  });
  it('registers Sunspire at the northern sanctuary location', () => {
    expect(requireLandmark('SUNSPIRE', 'sanctum', { mapPositionX: 1200, mapPositionY: 330 })).toMatchObject({
      type: 'sanctum',
    });
  });
});
