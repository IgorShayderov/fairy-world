import { useMapObjects } from './useMapObjects';

export function useMapGenerator() {
  const {
    drawBackground,
    drawSea,
    drawRivers,
    drawRoads,
    drawMountainRanges,
    drawForests,
    drawCastlesAndCities,
    drawCompass,
  } = useMapObjects();

  // Главная функция, собирающая всё воедино
  const renderProceduralMap = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    drawBackground(ctx, width, height);
    drawSea(ctx);
    drawRivers(ctx);
    drawRoads(ctx);
    drawMountainRanges(ctx);
    drawForests(ctx);
    drawCastlesAndCities(ctx);
    drawCompass(ctx);
  };

  return {
    renderProceduralMap,
  };
}
