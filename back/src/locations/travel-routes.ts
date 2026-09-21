type Point = { x: number; y: number };

export const TRAVEL_ROUTES: Point[][] = [
  [
    { x: 520, y: 850 },
    { x: 940, y: 620 },
  ],
  [
    { x: 450, y: 350 },
    { x: 940, y: 620 },
  ],
  [
    { x: 940, y: 620 },
    { x: 1200, y: 330 },
  ],
  [
    { x: 1200, y: 330 },
    { x: 1770, y: 300 },
  ],
  [
    { x: 940, y: 620 },
    { x: 1470, y: 960 },
  ],
  [
    { x: 1470, y: 960 },
    { x: 1700, y: 885 },
    { x: 1880, y: 710 },
    { x: 2025, y: 535 },
    { x: 2060, y: 570 },
  ],
  [
    { x: 2060, y: 570 },
    { x: 2250, y: 535 },
    { x: 2580, y: 535 },
    { x: 2530, y: 520 },
  ],
  [
    { x: 2530, y: 520 },
    { x: 2770, y: 600 },
    { x: 2850, y: 950 },
    { x: 2680, y: 1040 },
  ],
  [
    { x: 1470, y: 960 },
    { x: 1190, y: 1080 },
    { x: 930, y: 1280 },
    { x: 720, y: 1480 },
  ],
  [
    { x: 720, y: 1480 },
    { x: 800, y: 1470 },
    { x: 880, y: 1550 },
    { x: 1120, y: 1580 },
  ],
  [
    { x: 1470, y: 960 },
    { x: 1470, y: 1090 },
    { x: 1350, y: 1240 },
    { x: 1120, y: 1580 },
  ],
  [
    { x: 1120, y: 1580 },
    { x: 1720, y: 1640 },
  ],
  [
    { x: 1720, y: 1640 },
    { x: 2240, y: 1540 },
  ],
  [
    { x: 2240, y: 1540 },
    { x: 2470, y: 1370 },
  ],
];

const distanceToSegment = (point: Point, start: Point, end: Point) => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  const ratio =
    lengthSquared === 0
      ? 0
      : Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared));
  return Math.hypot(point.x - (start.x + ratio * dx), point.y - (start.y + ratio * dy));
};

export const isOnTravelRoute = (x: number, y: number, tolerance = 18) =>
  TRAVEL_ROUTES.some((points) =>
    points.slice(1).some((end, index) => distanceToSegment({ x, y }, points[index], end) <= tolerance),
  );
