import { useMapObjects } from './useMapObjects';

export function useMapGenerator() {
  const {
    drawBackground,
    drawSea,
    drawWetlands,
    drawRegionalDecorations,
    drawRivers,
    drawRoads,
    drawMountainRanges,
    drawForests,
    drawCastlesAndCities,
    drawSeaLabels,
    isPointOnLand,
  } = useMapObjects();

  // Главная функция, собирающая всё воедино
  const renderProceduralMap = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    drawBackground(ctx, width, height);
    drawSea(ctx);
    drawWetlands(ctx);
    drawRegionalDecorations(ctx);
    drawRivers(ctx);
    drawRoads(ctx);
    drawMountainRanges(ctx);
    drawForests(ctx);
    drawCastlesAndCities(ctx);
    drawSeaLabels(ctx);
  };

  return {
    renderProceduralMap,
    isPointOnLand,
  };
}
