import { townAt } from './towns';
import { isOnTravelRoute } from './travel-routes';

type Point = { x: number; y: number };
type TerrainFeature = Point & { rx: number; ry: number; angle: number };
type ForestRegion = Point & { radiusX: number; radiusY: number };

const bogs: TerrainFeature[] = [
  { x: 420, y: 1510, rx: 150, ry: 88, angle: 0.15 },
  { x: 2900, y: 1450, rx: 175, ry: 105, angle: -0.32 },
  { x: 1250, y: 1900, rx: 125, ry: 72, angle: 0.08 },
];

const forests: ForestRegion[] = [
  { x: 790, y: 1220, radiusX: 360, radiusY: 320 },
  { x: 1810, y: 1510, radiusX: 420, radiusY: 260 },
  { x: 2560, y: 1010, radiusX: 210, radiusY: 300 },
  { x: 470, y: 590, radiusX: 250, radiusY: 135 },
  { x: 2780, y: 1520, radiusX: 265, radiusY: 180 },
  { x: 1330, y: 1450, radiusX: 185, radiusY: 125 },
  { x: 2840, y: 510, radiusX: 205, radiusY: 105 },
];

const insideRotatedEllipse = (point: Point, feature: TerrainFeature) => {
  const dx = point.x - feature.x;
  const dy = point.y - feature.y;
  const localX = dx * Math.cos(feature.angle) + dy * Math.sin(feature.angle);
  const localY = -dx * Math.sin(feature.angle) + dy * Math.cos(feature.angle);
  return (localX / feature.rx) ** 2 + (localY / feature.ry) ** 2 <= 1;
};

export const isInBog = (point: Point) => bogs.some((bog) => insideRotatedEllipse(point, bog));

export const isInForest = (point: Point) =>
  forests.some(
    (forest) => ((point.x - forest.x) / forest.radiusX) ** 2 + ((point.y - forest.y) / forest.radiusY) ** 2 <= 1,
  );

export const encounterChanceAt = (point: Point) => {
  if (isOnTravelRoute(point.x, point.y)) return 0.1;
  if (isInBog(point) || isInForest(point)) return 0.3;
  return 0.2;
};

export const canRetreatAt = (point: Point) =>
  isOnTravelRoute(point.x, point.y) || Boolean(townAt({ mapPositionX: point.x, mapPositionY: point.y }));
