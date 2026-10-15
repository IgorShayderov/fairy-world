import { townAt } from './towns';
import { isOnTravelRoute } from './travel-routes';

describe('Moonfall approach', () => {
  it('recognizes the relocated city, not the old bridge approach, as town access', () => {
    expect(townAt({ mapPositionX: 2060, mapPositionY: 690 })?.name).toBe('MOONFALL');
    expect(townAt({ mapPositionX: 2060, mapPositionY: 570 })).toBeUndefined();
  });

  it('recognizes both updated connecting roads', () => {
    expect(isOnTravelRoute(2060, 630)).toBe(true);
    expect(isOnTravelRoute(2110, 655)).toBe(true);
  });
});
