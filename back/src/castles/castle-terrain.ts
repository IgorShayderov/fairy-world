import { isInBog, isInForest } from '../locations/map-terrain';
import { TOWNS } from '../locations/towns';
import { encounterLandmarks } from '../locations/landmarks';

type Point = { x: number; y: number };
// Matches the procedural atlas. The parity test protects these geometry inputs.
export const castleRivers = [
  [
    [2200, 55],
    [2170, 205],
    [2130, 370],
    [2010, 620],
    [1840, 790],
    [1680, 980],
    [1470, 1040],
    [1260, 1220],
    [990, 1360],
    [690, 1660],
    [585, 1835],
    [500, 1995],
    [455, 2075],
  ],
  [
    [1660, 980],
    [1840, 1130],
    [1900, 1380],
    [2060, 1740],
    [2140, 1900],
    [2200, 2040],
    [2225, 2115],
  ],
].map((river) => river.map(([x, y]) => ({ x, y })));
const coastline = [
  [120, 350],
  [360, 75, 820, 45, 1120, 145],
  [1370, 225, 1490, 105, 1730, 105],
  [2040, 95, 2260, 170, 2490, 110],
  [2820, 25, 3135, 245, 3065, 570],
  [3025, 780, 3200, 915, 3100, 1130],
  [3020, 1320, 3130, 1530, 2910, 1745],
  [2680, 1970, 2380, 1870, 2110, 2030],
  [1850, 2180, 1550, 2030, 1300, 2070],
  [970, 2120, 770, 1960, 480, 1950],
  [150, 1940, 15, 1690, 105, 1415],
  [175, 1190, -15, 1020, 80, 800],
  [145, 645, -40, 515, 120, 350],
];
const mainland: Point[] = [{ x: 120, y: 350 }];
for (const [a, b, c, d, x, y] of coastline.slice(1)) {
  const start = mainland[mainland.length - 1];
  for (let i = 1; i <= 40; i++) {
    const t = i / 40,
      s = 1 - t;
    mainland.push({
      x: s ** 3 * start.x + 3 * s * s * t * a + 3 * s * t * t * c + t ** 3 * x,
      y: s ** 3 * start.y + 3 * s * s * t * b + 3 * s * t * t * d + t ** 3 * y,
    });
  }
}
function insidePolygon(point: Point, polygon: Point[]) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i],
      b = polygon[j];
    if (a.y > point.y !== b.y > point.y && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x)
      inside = !inside;
  }
  return inside;
}
function distance(point: Point, a: Point, b: Point) {
  const dx = b.x - a.x,
    dy = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(point.x - a.x - t * dx, point.y - a.y - t * dy);
}
const riverCurves = castleRivers.map((points) => {
  const curve: Point[] = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const start = curve[curve.length - 1],
      control = points[i];
    const end =
      i === points.length - 2
        ? points[i + 1]
        : { x: (control.x + points[i + 1].x) / 2, y: (control.y + points[i + 1].y) / 2 };
    for (let step = 1; step <= 30; step++) {
      const t = step / 30,
        s = 1 - t;
      curve.push({
        x: s * s * start.x + 2 * s * t * control.x + t * t * end.x,
        y: s * s * start.y + 2 * s * t * control.y + t * t * end.y,
      });
    }
  }
  return curve;
});
const lakes = [
  [360, 1120, 105, 68, -0.22],
  [2320, 1180, 128, 72, 0.28],
  [1040, 1810, 92, 54, -0.12],
  [2835, 350, 150, 78, -0.16],
];
export const castleMountains = (() => {
  let seed = 9127;
  const random = () => {
    seed += 0x6d2b79f5;
    let r = seed;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
  return [
    { x: 1510, y: 520, count: 15, dx: 69, slope: -4 },
    { x: 2380, y: 650, count: 13, dx: 23, slope: 64 },
  ].flatMap((range) =>
    Array.from({ length: range.count }, (_, i) => {
      const size = 72 + random() * 42;
      const mountain = {
        x: range.x + i * range.dx + (random() - 0.5) * 34,
        y: range.y + i * range.slope + (random() - 0.5) * 46,
        size,
        widthScale: 0.78 + random() * 0.38,
        lean: (random() - 0.5) * 0.22,
      };
      random(); // Snow-line variation also advances the atlas seed.
      return mountain;
    }),
  );
})();

export const CASTLE_CITY_RADIUS = 260;
// Compact icon spacing, with separate rectangular guards for the wider atlas labels.
export const CASTLE_CLEARANCE = 180;
const protectedLandmarks = [...TOWNS, ...Object.values(encounterLandmarks)];
export const castleHasClearance = (x: number, y: number) =>
  protectedLandmarks.every(
    (p) => Math.hypot(x - p.x, y - p.y) >= CASTLE_CLEARANCE && (Math.abs(x - p.x) >= 250 || Math.abs(y - p.y) >= 150),
  ) &&
  // The Moonward Stones are decorative, but their stones and title also need space.
  !(x > 1105 && x < 1545 && y > 510 && y < 850);
// Villages are not cities: Aurelia, Moonfall, Westmere and Larkhaven qualify.
export const CASTLE_CITIES = TOWNS.filter((town) => [2, 3, 5, 7].includes(town.shopId));
export function castleSite(x: number, y: number) {
  const invalid = (reason: string) => ({ valid: false, reason, city: null as string | null });
  if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > 3200 || y < 0 || y > 2100)
    return invalid('Choose a point inside the world map.');
  const nearest = [...CASTLE_CITIES].sort((a, b) => Math.hypot(x - a.x, y - a.y) - Math.hypot(x - b.x, y - b.y))[0];
  if (Math.hypot(x - nearest.x, y - nearest.y) > CASTLE_CITY_RADIUS)
    return invalid(`Build within ${CASTLE_CITY_RADIUS} map units of a city: Aurelia, Moonfall, Westmere or Larkhaven.`);
  if (!castleHasClearance(x, y))
    return invalid(`Leave space around city and landmark icons and labels (${CASTLE_CLEARANCE} map units).`);
  // Check the whole footprint, not just its center, against terrain and coastline.
  const footprint = [
    { x, y },
    ...Array.from({ length: 16 }, (_, i) => ({
      x: x + 26 * Math.cos((i * Math.PI) / 8),
      y: y + 26 * Math.sin((i * Math.PI) / 8),
    })),
  ];
  for (const p of footprint) {
    if (!insidePolygon(p, mainland)) return invalid('Castles must stand on dry land.');
    if (isInBog(p) || isInForest(p)) return invalid('Choose open ground outside forests and bogs.');
    if (riverCurves.some((curve) => curve.slice(1).some((end, i) => distance(p, curve[i], end) <= 18)))
      return invalid('Castles cannot be built on rivers or bridges.');
    if (
      lakes.some(([cx, cy, rx, ry, angle]) => {
        const dx = p.x - cx,
          dy = p.y - cy;
        return (
          ((dx * Math.cos(angle) + dy * Math.sin(angle)) / (rx * 1.1)) ** 2 +
            ((-dx * Math.sin(angle) + dy * Math.cos(angle)) / (ry * 1.1)) ** 2 <=
          1
        );
      })
    )
      return invalid('Castles cannot be built on lakes.');
    if (
      castleMountains.some((m) => {
        const t = (p.y - (m.y - m.size)) / (m.size * 1.34);
        const peak = m.x + m.size * m.lean * m.widthScale;
        return t >= 0 && t <= 1 && Math.abs(p.x - (peak + (m.x - peak) * t)) <= m.size * m.widthScale * 0.78 * t + 8;
      })
    )
      return invalid('Choose ground outside the mountains.');
  }
  return { valid: true, reason: 'Open ground suitable for your castle.', city: nearest.name as string | null };
}

/** Move legacy crowded or distant plots locally, retaining their city and all castle progress. */
export function uncrowdedCastleSite(point: Point & { city: string }): Point | null {
  const city = CASTLE_CITIES.find((candidate) => candidate.name === point.city);
  if (!city) return null;
  if (castleHasClearance(point.x, point.y) && Math.hypot(point.x - city.x, point.y - city.y) <= CASTLE_CITY_RADIUS)
    return null;
  // Search nearest rings first, allowing for the former 350-unit build radius.
  for (let radius = 10; radius <= 350 + CASTLE_CITY_RADIUS; radius += 10) {
    for (let angle = 0; angle < 360; angle += 5) {
      const x = Math.round(point.x + radius * Math.cos((angle * Math.PI) / 180));
      const y = Math.round(point.y + radius * Math.sin((angle * Math.PI) / 180));
      const site = castleSite(x, y);
      if (site.valid && site.city === point.city) return { x, y };
    }
  }
  return null;
}
