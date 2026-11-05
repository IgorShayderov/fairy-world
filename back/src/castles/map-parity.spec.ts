import { castleRivers, castleMountains } from './castle-terrain';
import { rivers, mountains } from '../../../front/src/modules/Game/composables/useMapObjects';
it('keeps server castle placement geometry aligned with the rendered atlas', () => {
  expect(castleRivers).toEqual(rivers);
  expect(castleMountains).toEqual(
    mountains.map(({ snowLine, ...mountain }) => {
      void snowLine;
      return mountain;
    }),
  );
});
