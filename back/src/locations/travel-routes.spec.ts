import { isOnTravelRoute } from './travel-routes';

describe('travel routes', () => {
  it('recognizes points on a route using the visible road width', () => {
    expect(isOnTravelRoute(730, 735)).toBe(true);
    expect(isOnTravelRoute(730, 760)).toBe(false);
  });
});
