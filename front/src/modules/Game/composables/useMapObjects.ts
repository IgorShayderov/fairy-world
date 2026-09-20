type Point = { x: number; y: number };

export type Landmark = Point & {
  sanctuaryId?: number;
  name: string;
  subtitle: string;
  type: 'capital' | 'city' | 'village' | 'dungeon' | 'sanctum';
  accent: string;
};

export const landmarks: Landmark[] = [
  { x: 1200, y: 330, name: 'SUNSPIRE', subtitle: 'Sanctuary of the Northern Sun', type: 'sanctum', sanctuaryId: 3, accent: '#ffd477' },
  { x: 1770, y: 300, name: 'ICEVAULT', subtitle: 'The Frozen Depths', type: 'dungeon', accent: '#8bcfe8' },
  { x: 450, y: 350, name: 'RAVENCRYPT', subtitle: 'The Forgotten Barrows', type: 'dungeon', accent: '#bb91de' },
  { x: 940, y: 620, name: 'AURELIA', subtitle: 'The Sunlit Citadel', type: 'capital', accent: '#f6cf72' },
  { x: 2060, y: 570, name: 'MOONFALL', subtitle: 'City of Silver Spires', type: 'city', accent: '#b8d9ff' },
  { x: 1470, y: 960, name: 'EVERCROSS', subtitle: 'The Wandering Market', type: 'village', accent: '#efbd74' },
  { x: 2470, y: 1370, name: 'EMBERDEEP', subtitle: 'Vault of the First Flame', type: 'dungeon', accent: '#ff8067' },
  { x: 720, y: 1480, name: 'STARGLEN', subtitle: 'Sanctuary of Whispers', type: 'sanctum', sanctuaryId: 1, accent: '#8ce5ca' },
  { x: 1720, y: 1640, name: 'MOSSKEEP', subtitle: 'Village beneath the Boughs', type: 'village', accent: '#a9d48c' },
  { x: 520, y: 850, name: 'WESTMERE', subtitle: 'Harbor of Amber Sails', type: 'city', accent: '#f4bd72' },
  { x: 2530, y: 520, name: 'FROSTWATCH', subtitle: 'The Northern Beacon', type: 'village', accent: '#c5e4ef' },
  { x: 1120, y: 1580, name: 'LARKHAVEN', subtitle: 'City of Green Glass', type: 'city', accent: '#f4bd72' },
  { x: 2680, y: 1040, name: 'HOLLOWGATE', subtitle: 'The Door Below', type: 'dungeon', accent: '#cf84f1' },
  { x: 2240, y: 1540, name: 'DAWNSHRINE', subtitle: 'Temple of the Last Star', type: 'sanctum', sanctuaryId: 2, accent: '#ffe08a' },
];

// Named endpoints keep roads stable when landmarks are inserted or reordered.
const road = (from: string, to: string, ...via: Point[]): Point[] => {
  const endpoint = (name: string) => {
    const point = landmarks.find((landmark) => landmark.name === name);
    if (!point) throw new Error(`Unknown road endpoint: ${name}`);
    return point;
  };
  return [endpoint(from), ...via, endpoint(to)];
};

export const roads: Point[][] = [
  road('WESTMERE', 'AURELIA'),
  road('RAVENCRYPT', 'AURELIA'),
  road('AURELIA', 'SUNSPIRE'),
  road('SUNSPIRE', 'ICEVAULT'),
  road('AURELIA', 'EVERCROSS'),
  road(
    'EVERCROSS',
    'MOONFALL',
    { x: 1700, y: 885 },
    { x: 1880, y: 710 },
    { x: 2025, y: 535 },
  ),
  road('MOONFALL', 'FROSTWATCH', { x: 2250, y: 535 }, { x: 2580, y: 535 }),
  road('FROSTWATCH', 'HOLLOWGATE', { x: 2770, y: 600 }, { x: 2850, y: 950 }),
  road('EVERCROSS', 'STARGLEN', { x: 1190, y: 1080 }, { x: 930, y: 1280 }),
  road('STARGLEN', 'LARKHAVEN', { x: 800, y: 1470 }, { x: 880, y: 1550 }),
  road('EVERCROSS', 'LARKHAVEN', { x: 1470, y: 1090 }, { x: 1350, y: 1240 }),
  road('LARKHAVEN', 'MOSSKEEP'),
  road('MOSSKEEP', 'DAWNSHRINE'),
  road('DAWNSHRINE', 'EMBERDEEP'),
];

export const rivers: Point[][] = [
  [
    { x: 2200, y: 55 },
    { x: 2170, y: 205 },
    { x: 2130, y: 370 },
    { x: 2010, y: 620 },
    { x: 1840, y: 790 },
    { x: 1680, y: 980 },
    { x: 1470, y: 1040 },
    { x: 1260, y: 1220 },
    { x: 990, y: 1360 },
    { x: 690, y: 1660 },
    { x: 585, y: 1835 },
    { x: 500, y: 1995 },
    { x: 455, y: 2075 },
  ],
  [
    { x: 1660, y: 980 },
    { x: 1840, y: 1130 },
    { x: 1900, y: 1380 },
    { x: 2060, y: 1740 },
    { x: 2140, y: 1900 },
    { x: 2200, y: 2040 },
    { x: 2225, y: 2115 },
  ],
];

const segmentIntersection = (a: Point, b: Point, c: Point, d: Point) => {
  const abX = b.x - a.x;
  const abY = b.y - a.y;
  const cdX = d.x - c.x;
  const cdY = d.y - c.y;
  const denominator = abX * cdY - abY * cdX;
  if (Math.abs(denominator) < 0.001) return null;
  const acX = c.x - a.x;
  const acY = c.y - a.y;
  const roadRatio = (acX * cdY - acY * cdX) / denominator;
  const riverRatio = (acX * abY - acY * abX) / denominator;
  if (roadRatio <= 0.03 || roadRatio >= 0.97 || riverRatio <= 0.03 || riverRatio >= 0.97) return null;
  return {
    x: a.x + abX * roadRatio,
    y: a.y + abY * roadRatio,
    // The routes themselves approach water close to its normal, allowing the
    // bridge deck to stay precisely aligned with the road on both banks.
    angle: Math.atan2(abY, abX),
  };
};

const detectedBridgeCrossings = roads.flatMap((route) =>
  route.slice(1).flatMap((roadEnd, roadIndex) =>
    rivers.flatMap((river) =>
      river.slice(1).flatMap((riverEnd, riverIndex) => {
        const crossing = segmentIntersection(route[roadIndex]!, roadEnd, river[riverIndex]!, riverEnd);
        return crossing ? [crossing] : [];
      }),
    ),
  ),
);

export const bridgeCrossings = [
  ...detectedBridgeCrossings,
  // The river bends at Evercross, so its crossing lands on a river vertex and
  // cannot be discovered as an ordinary segment intersection.
  { x: 1470, y: 1040, angle: Math.PI / 2 },
];

const distanceToOrientedRectangle = (
  point: Point,
  center: Point,
  angle: number,
  halfLength: number,
  halfWidth: number,
) => {
  const offsetX = point.x - center.x;
  const offsetY = point.y - center.y;
  const localX = offsetX * Math.cos(angle) + offsetY * Math.sin(angle);
  const localY = -offsetX * Math.sin(angle) + offsetY * Math.cos(angle);
  return Math.abs(localX) <= halfLength && Math.abs(localY) <= halfWidth;
};

export const isPointOnBridge = (x: number, y: number) =>
  bridgeCrossings.some((bridge) => distanceToOrientedRectangle({ x, y }, bridge, bridge.angle, 36, 16));

export const isPointInRiver = (x: number, y: number, tolerance = 14) =>
  rivers.some((river) =>
    river.slice(1).some((end, index) => distanceToSegment({ x, y }, river[index]!, end) <= tolerance),
  );

export const isPointInMountain = (x: number, y: number, padding = 8) =>
  mountains.some((mountain) => {
    const top = mountain.y - mountain.size;
    const bottom = mountain.y + mountain.size * 0.34;
    const verticalRatio = (y - top) / (bottom - top);
    if (verticalRatio < 0 || verticalRatio > 1) return false;
    const peakX = mountain.x + mountain.size * mountain.lean * mountain.widthScale;
    const centerX = peakX + (mountain.x - peakX) * verticalRatio;
    const halfWidth = mountain.size * mountain.widthScale * 0.78 * verticalRatio + padding;
    return Math.abs(x - centerX) <= halfWidth;
  });

const distanceToSegment = (point: Point, start: Point, end: Point) => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  const ratio = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared));
  return Math.hypot(point.x - (start.x + ratio * dx), point.y - (start.y + ratio * dy));
};

export const isPointOnRoute = (x: number, y: number, tolerance = 18) =>
  roads.some((points) => points.slice(1).some((end, index) => distanceToSegment({ x, y }, points[index]!, end) <= tolerance));

const seededRandom = (seed: number) => {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
};

export const mountains = (() => {
  const random = seededRandom(9127);
  return [
    { x: 1510, y: 520, count: 15, dx: 69, slope: -4 },
    { x: 2380, y: 650, count: 13, dx: 23, slope: 64 },
  ].flatMap((range) => Array.from({ length: range.count }, (_, index) => {
    const size = 72 + random() * 42;
    return {
      x: range.x + index * range.dx + (random() - 0.5) * 34,
      y: range.y + index * range.slope + (random() - 0.5) * 46,
      size,
      widthScale: 0.78 + random() * 0.38,
      lean: (random() - 0.5) * 0.22,
      snowLine: 0.42 + random() * 0.14,
    };
  }));
})();

type TerrainFeature = Point & { rx: number; ry: number; angle: number; seed: number };

export const lakes: TerrainFeature[] = [
  { x: 360, y: 1120, rx: 105, ry: 68, angle: -0.22, seed: 31 },
  { x: 2320, y: 1180, rx: 128, ry: 72, angle: 0.28, seed: 47 },
  { x: 1040, y: 1810, rx: 92, ry: 54, angle: -0.12, seed: 73 },
];

export const frozenLakes: TerrainFeature[] = [
  { x: 2835, y: 350, rx: 150, ry: 78, angle: -0.16, seed: 89 },
];

export const bogs: TerrainFeature[] = [
  { x: 420, y: 1510, rx: 150, ry: 88, angle: 0.15, seed: 101 },
  { x: 2900, y: 1450, rx: 175, ry: 105, angle: -0.32, seed: 133 },
  { x: 1250, y: 1900, rx: 125, ry: 72, angle: 0.08, seed: 171 },
];

const isInsideFeature = (feature: TerrainFeature, x: number, y: number, padding = 0) => {
  const offsetX = x - feature.x;
  const offsetY = y - feature.y;
  const localX = offsetX * Math.cos(feature.angle) + offsetY * Math.sin(feature.angle);
  const localY = -offsetX * Math.sin(feature.angle) + offsetY * Math.cos(feature.angle);
  return (localX * localX) / (feature.rx + padding) ** 2 + (localY * localY) / (feature.ry + padding) ** 2 <= 1;
};

export const isPointInBog = (x: number, y: number) => bogs.some((bog) => isInsideFeature(bog, x, y));

const terrainPoints = (feature: TerrainFeature) => {
  const random = seededRandom(feature.seed);
  return Array.from({ length: 14 }, (_, index) => {
    const angle = (index / 14) * Math.PI * 2;
    const wobble = 0.84 + random() * 0.24;
    const localX = Math.cos(angle) * feature.rx * wobble;
    const localY = Math.sin(angle) * feature.ry * wobble;
    return {
      x: feature.x + localX * Math.cos(feature.angle) - localY * Math.sin(feature.angle),
      y: feature.y + localX * Math.sin(feature.angle) + localY * Math.cos(feature.angle),
    };
  });
};

const traceTerrainFeature = (ctx: CanvasRenderingContext2D, feature: TerrainFeature) => {
  const points = terrainPoints(feature);
  const first = points[0]!;
  const last = points.at(-1)!;
  ctx.beginPath();
  ctx.moveTo((last.x + first.x) / 2, (last.y + first.y) / 2);
  for (let index = 0; index < points.length; index++) {
    const point = points[index]!;
    const next = points[(index + 1) % points.length]!;
    ctx.quadraticCurveTo(point.x, point.y, (point.x + next.x) / 2, (point.y + next.y) / 2);
  }
  ctx.closePath();
};

const traceMainland = (ctx: CanvasRenderingContext2D) => {
  ctx.beginPath();
  ctx.moveTo(120, 350);
  ctx.bezierCurveTo(360, 75, 820, 45, 1120, 145);
  ctx.bezierCurveTo(1370, 225, 1490, 105, 1730, 105);
  ctx.bezierCurveTo(2040, 95, 2260, 170, 2490, 110);
  ctx.bezierCurveTo(2820, 25, 3135, 245, 3065, 570);
  ctx.bezierCurveTo(3025, 780, 3200, 915, 3100, 1130);
  ctx.bezierCurveTo(3020, 1320, 3130, 1530, 2910, 1745);
  ctx.bezierCurveTo(2680, 1970, 2380, 1870, 2110, 2030);
  ctx.bezierCurveTo(1850, 2180, 1550, 2030, 1300, 2070);
  ctx.bezierCurveTo(970, 2120, 770, 1960, 480, 1950);
  ctx.bezierCurveTo(150, 1940, 15, 1690, 105, 1415);
  ctx.bezierCurveTo(175, 1190, -15, 1020, 80, 800);
  ctx.bezierCurveTo(145, 645, -40, 515, 120, 350);
  ctx.closePath();
};

const drawPath = (ctx: CanvasRenderingContext2D, points: Point[]) => {
  ctx.beginPath();
  ctx.moveTo(points[0]!.x, points[0]!.y);
  for (let index = 1; index < points.length - 2; index++) {
    const point = points[index]!;
    const next = points[index + 1]!;
    ctx.quadraticCurveTo(point.x, point.y, (point.x + next.x) / 2, (point.y + next.y) / 2);
  }
  const penultimate = points.at(-2)!;
  const last = points.at(-1)!;
  ctx.quadraticCurveTo(penultimate.x, penultimate.y, last.x, last.y);
};

export function useMapObjects() {
  const drawBackground = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const ocean = ctx.createLinearGradient(0, 0, width, height);
    ocean.addColorStop(0, '#102f43');
    ocean.addColorStop(0.5, '#174b5b');
    ocean.addColorStop(1, '#0b273a');
    ctx.fillStyle = ocean;
    ctx.fillRect(0, 0, width, height);

    const random = seededRandom(8842);
    ctx.save();
    ctx.globalAlpha = 0.15;
    ctx.strokeStyle = '#8ad4d1';
    ctx.lineWidth = 2;
    for (let index = 0; index < 130; index++) {
      const x = random() * width;
      const y = random() * height;
      const length = 22 + random() * 52;
      ctx.beginPath();
      ctx.arc(x, y, length, Math.PI * 0.12, Math.PI * 0.88);
      ctx.stroke();
    }
    ctx.restore();
  };

  const drawSea = (ctx: CanvasRenderingContext2D) => {
    ctx.save();
    ctx.shadowColor = 'rgba(6, 18, 28, 0.65)';
    ctx.shadowBlur = 42;
    ctx.shadowOffsetY = 24;
    traceMainland(ctx);
    const land = ctx.createLinearGradient(400, 250, 2600, 1850);
    land.addColorStop(0, '#d9c99b');
    land.addColorStop(0.48, '#c8b783');
    land.addColorStop(1, '#ad9666');
    ctx.fillStyle = land;
    ctx.fill();
    ctx.restore();

    traceMainland(ctx);
    ctx.lineWidth = 26;
    ctx.strokeStyle = 'rgba(226, 207, 151, 0.42)';
    ctx.stroke();
    traceMainland(ctx);
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#675a42';
    ctx.stroke();
    traceMainland(ctx);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255, 244, 197, 0.75)';
    ctx.stroke();

    ctx.save();
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = '#4c3e2c';
    const random = seededRandom(2048);
    for (let index = 0; index < 1800; index++) {
      ctx.fillRect(330 + random() * 2500, 260 + random() * 1540, 1.5, 1.5);
    }
    ctx.restore();
  };

  const drawWetlands = (ctx: CanvasRenderingContext2D) => {
    for (const lake of lakes) {
      ctx.save();
      traceTerrainFeature(ctx, lake);
      ctx.shadowColor = 'rgba(15, 55, 64, 0.28)';
      ctx.shadowBlur = 16;
      const water = ctx.createRadialGradient(
        lake.x - lake.rx * 0.2,
        lake.y - lake.ry * 0.25,
        4,
        lake.x,
        lake.y,
        lake.rx,
      );
      water.addColorStop(0, '#83c7be');
      water.addColorStop(0.52, '#4d9998');
      water.addColorStop(1, '#286b78');
      ctx.fillStyle = water;
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.lineWidth = 9;
      ctx.strokeStyle = 'rgba(88, 91, 57, 0.42)';
      ctx.stroke();
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(213, 229, 200, 0.68)';
      ctx.stroke();
      ctx.clip();
      ctx.lineCap = 'round';
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(211, 244, 229, 0.35)';
      for (let line = -2; line <= 2; line++) {
        ctx.beginPath();
        ctx.ellipse(lake.x + line * 15, lake.y + line * 7, lake.rx * 0.58, lake.ry * 0.2, lake.angle, 0, Math.PI);
        ctx.stroke();
      }
      ctx.restore();
    }

    for (const lake of frozenLakes) {
      ctx.save();
      traceTerrainFeature(ctx, lake);
      ctx.shadowColor = 'rgba(45, 83, 96, 0.3)';
      ctx.shadowBlur = 18;
      const ice = ctx.createLinearGradient(
        lake.x - lake.rx,
        lake.y - lake.ry,
        lake.x + lake.rx,
        lake.y + lake.ry,
      );
      ice.addColorStop(0, '#dce9e6');
      ice.addColorStop(0.45, '#a9cfd0');
      ice.addColorStop(1, '#719fac');
      ctx.fillStyle = ice;
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.lineWidth = 11;
      ctx.strokeStyle = 'rgba(221, 226, 205, 0.7)';
      ctx.stroke();
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(60, 92, 101, 0.65)';
      ctx.stroke();
      ctx.clip();

      const random = seededRandom(lake.seed + 500);
      ctx.lineCap = 'round';
      for (let crack = 0; crack < 13; crack++) {
        let x = lake.x + (random() - 0.5) * lake.rx * 1.25;
        let y = lake.y + (random() - 0.5) * lake.ry * 0.9;
        ctx.beginPath();
        ctx.moveTo(x, y);
        const segments = 2 + Math.floor(random() * 3);
        for (let segment = 0; segment < segments; segment++) {
          x += (random() - 0.5) * 42;
          y += (random() - 0.5) * 24;
          ctx.lineTo(x, y);
        }
        ctx.lineWidth = crack % 3 === 0 ? 2.3 : 1.2;
        ctx.strokeStyle = crack % 3 === 0 ? 'rgba(45, 91, 107, 0.68)' : 'rgba(239, 251, 247, 0.78)';
        ctx.stroke();
      }
      ctx.restore();

      ctx.save();
      ctx.textAlign = 'center';
      ctx.font = 'italic 600 23px Georgia, serif';
      ctx.fillStyle = 'rgba(54, 75, 76, 0.78)';
      ctx.fillText('The Glassmere', lake.x, lake.y - lake.ry - 24);
      ctx.restore();
    }

    for (const bog of bogs) {
      ctx.save();
      traceTerrainFeature(ctx, bog);
      ctx.fillStyle = 'rgba(81, 100, 69, 0.42)';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 8]);
      ctx.strokeStyle = 'rgba(63, 77, 52, 0.55)';
      ctx.stroke();
      ctx.setLineDash([]);

      const random = seededRandom(bog.seed + 700);
      for (let pool = 0; pool < 9; pool++) {
        const px = bog.x + (random() - 0.5) * bog.rx * 1.25;
        const py = bog.y + (random() - 0.5) * bog.ry * 1.1;
        ctx.beginPath();
        ctx.ellipse(px, py, 9 + random() * 16, 4 + random() * 7, random() * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(49, 105, 99, 0.65)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(190, 189, 125, 0.45)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      ctx.strokeStyle = '#596642';
      ctx.lineWidth = 2;
      for (let reed = 0; reed < 28; reed++) {
        const rx = bog.x + (random() - 0.5) * bog.rx * 1.55;
        const ry = bog.y + (random() - 0.5) * bog.ry * 1.25;
        const height = 8 + random() * 12;
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx + (random() - 0.5) * 4, ry - height);
        ctx.stroke();
      }
      ctx.restore();
    }
  };

  const drawRegionalDecorations = (ctx: CanvasRenderingContext2D) => {
    // A weathered ceremonial site fills the western approach to Moonfall
    // without reading as another interactive map destination.
    ctx.save();
    ctx.translate(1325, 700);
    ctx.fillStyle = 'rgba(91, 79, 56, 0.14)';
    ctx.beginPath();
    ctx.ellipse(0, 16, 145, 70, -0.12, 0, Math.PI * 2);
    ctx.fill();
    for (let index = 0; index < 11; index++) {
      const angle = (index / 11) * Math.PI * 2;
      const x = Math.cos(angle) * 112;
      const y = Math.sin(angle) * 48;
      const height = 25 + (index % 3) * 7;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((index % 2 ? -1 : 1) * 0.08);
      ctx.beginPath();
      ctx.moveTo(-7, 5);
      ctx.lineTo(-5, -height + 5);
      ctx.lineTo(1, -height);
      ctx.lineTo(8, -height + 8);
      ctx.lineTo(7, 6);
      ctx.closePath();
      const stone = ctx.createLinearGradient(-8, 0, 8, 0);
      stone.addColorStop(0, '#595d55');
      stone.addColorStop(0.52, '#929384');
      stone.addColorStop(1, '#454b48');
      ctx.fillStyle = stone;
      ctx.fill();
      ctx.strokeStyle = 'rgba(47, 52, 48, 0.7)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    }
    ctx.beginPath();
    ctx.ellipse(0, 10, 58, 24, -0.12, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(83, 73, 55, 0.55)';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 7]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.textAlign = 'center';
    ctx.font = 'italic 600 21px Georgia, serif';
    ctx.fillStyle = 'rgba(62, 59, 48, 0.75)';
    ctx.fillText('The Moonward Stones', 0, -108);
    ctx.restore();

    // Moonfall's lower valley is scattered with luminous mineral outcrops.
    ctx.save();
    ctx.translate(2135, 900);
    const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, 155);
    glow.addColorStop(0, 'rgba(135, 210, 218, 0.2)');
    glow.addColorStop(1, 'rgba(135, 210, 218, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(-170, -120, 340, 240);
    const crystals = [
      [-112, 22, 31, -0.14],
      [-72, -28, 45, 0.08],
      [-25, 30, 26, -0.06],
      [24, -16, 54, 0.1],
      [76, 25, 34, -0.12],
      [119, -18, 42, 0.06],
    ] as const;
    for (const [x, y, height, lean] of crystals) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(lean);
      ctx.shadowColor = 'rgba(113, 211, 226, 0.7)';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(0, -height);
      ctx.lineTo(10, -height * 0.28);
      ctx.lineTo(7, 5);
      ctx.lineTo(-8, 5);
      ctx.lineTo(-11, -height * 0.3);
      ctx.closePath();
      const crystal = ctx.createLinearGradient(-10, 0, 10, 0);
      crystal.addColorStop(0, '#477e8f');
      crystal.addColorStop(0.48, '#bfe7e6');
      crystal.addColorStop(1, '#5d9eae');
      ctx.fillStyle = crystal;
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.strokeStyle = 'rgba(50, 91, 103, 0.78)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -height);
      ctx.lineTo(1, 2);
      ctx.strokeStyle = 'rgba(244, 255, 250, 0.55)';
      ctx.stroke();
      ctx.restore();
    }
    ctx.textAlign = 'center';
    ctx.font = 'italic 600 22px Georgia, serif';
    ctx.fillStyle = 'rgba(48, 75, 76, 0.78)';
    ctx.fillText('Lunarglass Vale', 0, 92);
    ctx.restore();
  };

  const drawRivers = (ctx: CanvasRenderingContext2D) => {
    ctx.save();
    traceMainland(ctx);
    ctx.clip();
    for (const river of rivers) {
      drawPath(ctx, river);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 28;
      ctx.strokeStyle = 'rgba(41, 116, 132, 0.25)';
      ctx.stroke();
      drawPath(ctx, river);
      ctx.lineWidth = 15;
      ctx.strokeStyle = '#438fa0';
      ctx.stroke();
      drawPath(ctx, river);
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(157, 231, 220, 0.75)';
      ctx.stroke();
    }
    ctx.restore();
  };

  const drawRoads = (ctx: CanvasRenderingContext2D) => {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const road of roads) {
      ctx.beginPath();
      ctx.moveTo(road[0]!.x, road[0]!.y);
      for (const point of road.slice(1)) ctx.lineTo(point.x, point.y);
      ctx.setLineDash([]);
      ctx.lineWidth = 20;
      ctx.strokeStyle = 'rgba(91, 69, 38, 0.18)';
      ctx.stroke();
      ctx.lineWidth = 13;
      ctx.strokeStyle = '#a98a55';
      ctx.stroke();
      ctx.lineWidth = 8;
      ctx.strokeStyle = '#d0b477';
      ctx.stroke();
      ctx.lineWidth = 2.5;
      ctx.setLineDash([11, 13]);
      ctx.strokeStyle = '#755332';
      ctx.stroke();

      ctx.setLineDash([]);
      ctx.lineWidth = 1.25;
      ctx.strokeStyle = 'rgba(255, 235, 172, 0.7)';
      ctx.translate(0, -3);
      ctx.stroke();
      ctx.translate(0, 3);
    }
    ctx.setLineDash([]);

    for (const bridge of bridgeCrossings) {
      ctx.save();
      ctx.translate(bridge.x, bridge.y);
      ctx.rotate(bridge.angle);
      ctx.shadowColor = 'rgba(44, 31, 18, 0.4)';
      ctx.shadowBlur = 7;
      ctx.shadowOffsetY = 5;
      ctx.fillStyle = '#5c4328';
      ctx.fillRect(-31, -12, 62, 24);
      ctx.shadowColor = 'transparent';
      const deck = ctx.createLinearGradient(0, -10, 0, 10);
      deck.addColorStop(0, '#d1ad68');
      deck.addColorStop(0.5, '#b4864c');
      deck.addColorStop(1, '#8c6239');
      ctx.fillStyle = deck;
      ctx.fillRect(-29, -9, 58, 18);
      ctx.strokeStyle = '#674629';
      ctx.lineWidth = 1.5;
      for (let plank = -24; plank <= 24; plank += 8) {
        ctx.beginPath();
        ctx.moveTo(plank, -9);
        ctx.lineTo(plank, 9);
        ctx.stroke();
      }
      ctx.strokeStyle = '#ead39a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-29, -8);
      ctx.lineTo(29, -8);
      ctx.moveTo(-29, 8);
      ctx.lineTo(29, 8);
      ctx.stroke();
      ctx.fillStyle = '#746044';
      ctx.fillRect(-34, -13, 5, 26);
      ctx.fillRect(29, -13, 5, 26);
      ctx.restore();
    }
    ctx.restore();
  };

  const drawMountain = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    widthScale: number,
    lean: number,
    snowLine: number,
  ) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(widthScale, 1);

    const peakX = size * lean;
    const traceMountain = () => {
      ctx.beginPath();
      ctx.moveTo(-size * 0.76, size * 0.34);
      ctx.quadraticCurveTo(-size * 0.58, size * 0.05, -size * 0.42, -size * 0.23);
      ctx.lineTo(-size * 0.3, -size * 0.37);
      ctx.lineTo(-size * 0.18 + peakX * 0.35, -size * 0.61);
      ctx.lineTo(peakX, -size);
      ctx.lineTo(size * 0.17 + peakX * 0.35, -size * 0.66);
      ctx.lineTo(size * 0.29, -size * 0.48);
      ctx.lineTo(size * 0.43, -size * 0.2);
      ctx.quadraticCurveTo(size * 0.61, size * 0.06, size * 0.78, size * 0.34);
      ctx.closePath();
    };

    ctx.beginPath();
    ctx.ellipse(size * 0.03, size * 0.34, size * 0.73, size * 0.12, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(42, 48, 43, 0.2)';
    ctx.fill();

    traceMountain();
    const rock = ctx.createLinearGradient(-size * 0.65, -size * 0.2, size * 0.68, size * 0.1);
    rock.addColorStop(0, '#3f4c4b');
    rock.addColorStop(0.34, '#728078');
    rock.addColorStop(0.58, '#596760');
    rock.addColorStop(1, '#2f3e3e');
    ctx.fillStyle = rock;
    ctx.shadowColor = 'rgba(22, 34, 32, 0.32)';
    ctx.shadowBlur = size * 0.1;
    ctx.shadowOffsetY = size * 0.06;
    ctx.fill();
    ctx.shadowColor = 'transparent';

    ctx.save();
    traceMountain();
    ctx.clip();

    ctx.beginPath();
    ctx.moveTo(-size * 0.76, size * 0.34);
    ctx.lineTo(peakX, -size);
    ctx.lineTo(size * 0.03, size * 0.34);
    ctx.closePath();
    ctx.fillStyle = 'rgba(165, 177, 164, 0.2)';
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(peakX, -size);
    ctx.lineTo(size * 0.78, size * 0.34);
    ctx.lineTo(size * 0.03, size * 0.34);
    ctx.closePath();
    ctx.fillStyle = 'rgba(19, 32, 32, 0.22)';
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(peakX, -size);
    ctx.lineTo(-size * 0.08, size * 0.29);
    ctx.lineTo(size * 0.17, size * 0.12);
    ctx.closePath();
    ctx.fillStyle = 'rgba(196, 199, 181, 0.1)';
    ctx.fill();
    ctx.restore();

    traceMountain();
    ctx.lineWidth = Math.max(2, size * 0.022);
    ctx.strokeStyle = '#33413e';
    ctx.stroke();

    const snowY = -size * snowLine;
    ctx.beginPath();
    ctx.moveTo(-size * 0.3 + peakX * 0.45, snowY);
    ctx.lineTo(peakX, -size);
    ctx.lineTo(size * 0.31 + peakX * 0.32, snowY + size * 0.01);
    ctx.lineTo(size * 0.19 + peakX * 0.3, snowY - size * 0.09);
    ctx.lineTo(size * 0.09 + peakX * 0.4, snowY + size * 0.055);
    ctx.lineTo(-size * 0.015 + peakX * 0.55, snowY - size * 0.04);
    ctx.lineTo(-size * 0.11 + peakX * 0.5, snowY + size * 0.085);
    ctx.lineTo(-size * 0.2 + peakX * 0.45, snowY - size * 0.035);
    ctx.closePath();
    const snow = ctx.createLinearGradient(peakX - size * 0.2, -size, peakX + size * 0.24, snowY);
    snow.addColorStop(0, '#fbfaf0');
    snow.addColorStop(0.55, '#e9eee7');
    snow.addColorStop(1, '#c9d5d0');
    ctx.fillStyle = snow;
    ctx.fill();

    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(1, size * 0.012);
    ctx.strokeStyle = 'rgba(33, 48, 46, 0.34)';
    for (const [ridgeX, ridgeY] of [
      [size * -0.37, size * 0.19] as const,
      [size * 0.2, size * 0.12] as const,
      [size * 0.48, size * 0.24] as const,
    ]) {
      ctx.beginPath();
      ctx.moveTo(peakX, -size * 0.91);
      ctx.quadraticCurveTo(ridgeX * 0.45, -size * 0.3, ridgeX, ridgeY);
      ctx.stroke();
    }

    for (const [rockX, rockY, radius] of [
      [-0.5, 0.29, 0.1] as const,
      [-0.31, 0.32, 0.075] as const,
      [0.42, 0.3, 0.09] as const,
      [0.59, 0.32, 0.06] as const,
    ]) {
      ctx.beginPath();
      ctx.ellipse(size * rockX, size * rockY, size * radius, size * radius * 0.48, -0.16, 0, Math.PI * 2);
      ctx.fillStyle = rockX < 0 ? '#52605b' : '#394743';
      ctx.fill();
    }
    ctx.restore();
  };

  const drawMountainRanges = (ctx: CanvasRenderingContext2D) => {
    for (const mountain of [...mountains].sort((a, b) => a.y - b.y)) {
      drawMountain(
        ctx,
        mountain.x,
        mountain.y,
        mountain.size,
        mountain.widthScale,
        mountain.lean,
        mountain.snowLine,
      );
    }

    ctx.save();
    ctx.font = '600 23px Georgia, serif';
    ctx.fillStyle = 'rgba(56, 55, 45, 0.7)';
    ctx.textAlign = 'center';
    ctx.letterSpacing = '6px';
    ctx.fillText('THE PALE CROWN', 1990, 315);
    ctx.restore();
  };

  const drawTree = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, hue: string) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = '#493b2b';
    ctx.fillRect(-size * 0.07, -size * 0.08, size * 0.14, size * 0.4);
    for (let layer = 0; layer < 3; layer++) {
      const layerY = -size * (0.28 + layer * 0.24);
      const width = size * (0.52 - layer * 0.07);
      ctx.beginPath();
      ctx.moveTo(0, layerY - size * 0.42);
      ctx.lineTo(-width, layerY + size * 0.22);
      ctx.quadraticCurveTo(0, layerY + size * 0.12, width, layerY + size * 0.22);
      ctx.closePath();
      ctx.fillStyle = hue;
      ctx.fill();
    }
    ctx.restore();
  };

  const drawForestCluster = (
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    radiusX: number,
    radiusY: number,
    count: number,
    seed: number,
    colors: string[]
  ) => {
    const random = seededRandom(seed);
    const trees: Array<{ x: number; y: number; size: number; color: string }> = [];
    let attempts = 0;
    while (trees.length < count && attempts < count * 8) {
      attempts++;
      const angle = random() * Math.PI * 2;
      const distance = Math.sqrt(random());
      const x = centerX + Math.cos(angle) * radiusX * distance;
      const y = centerY + Math.sin(angle) * radiusY * distance;
      const size = 22 + random() * 24;
      const blocksRoad = isPointOnRoute(x, y, 30 + size * 0.5);
      const blocksLandmark = landmarks.some((landmark) => Math.hypot(x - landmark.x, y - landmark.y) < 64 + size);
      const insideLake = [...lakes, ...frozenLakes].some(
        (lake) => Math.hypot((x - lake.x) / lake.rx, (y - lake.y) / lake.ry) < 1.15,
      );
      if (blocksRoad || blocksLandmark || insideLake) continue;
      trees.push({ x, y, size, color: colors[Math.floor(random() * colors.length)]! });
    }
    trees.sort((a, b) => a.y - b.y);
    for (const tree of trees) drawTree(ctx, tree.x, tree.y, tree.size, tree.color);
  };

  const drawForests = (ctx: CanvasRenderingContext2D) => {
    drawForestCluster(ctx, 790, 1220, 360, 320, 180, 426, ['#244b3a', '#315d45', '#3d694e']);
    drawForestCluster(ctx, 1810, 1510, 420, 260, 205, 814, ['#2a4935', '#3d6244', '#496c49']);
    drawForestCluster(ctx, 2560, 1010, 210, 300, 105, 732, ['#314f45', '#426359', '#526f60']);
    drawForestCluster(ctx, 470, 590, 250, 135, 70, 921, ['#294b3b', '#385b45', '#45664d']);
    drawForestCluster(ctx, 2780, 1520, 265, 180, 82, 1027, ['#354d3d', '#49614a', '#596f52']);
    drawForestCluster(ctx, 1330, 1450, 185, 125, 52, 1181, ['#264d3c', '#315d45', '#45684c']);
    drawForestCluster(ctx, 2840, 510, 205, 105, 46, 1297, ['#36565a', '#46686a', '#5b7775']);

    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = 'italic 600 25px Georgia, serif';
    ctx.fillStyle = 'rgba(42, 64, 48, 0.78)';
    ctx.fillText('Whisperwood', 760, 920);
    ctx.fillText('The Elderwild', 1830, 1310);
    ctx.fillText('Blackpine Reach', 470, 435);
    ctx.fillText('The Mirewood', 2780, 1190);
    ctx.fillText('Frostpine Tundra', 2830, 555);
    ctx.restore();
  };

  const drawLandmarkIcon = (ctx: CanvasRenderingContext2D, landmark: Landmark) => {
    const { x, y, type, accent } = landmark;
    const radius = type === 'capital' ? 39 : type === 'city' ? 36 : 33;
    ctx.save();
    ctx.translate(x, y);

    ctx.beginPath();
    ctx.ellipse(0, radius * 0.72, radius * 1.25, radius * 0.37, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(45, 39, 27, 0.24)';
    ctx.fill();

    ctx.shadowColor = accent;
    ctx.shadowBlur = type === 'dungeon' || type === 'sanctum' ? 28 : 18;

    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    const badge = ctx.createRadialGradient(-radius * 0.28, -radius * 0.35, 2, 0, 0, radius);
    badge.addColorStop(0, '#28434a');
    badge.addColorStop(0.68, '#182d34');
    badge.addColorStop(1, '#0d2028');
    ctx.fillStyle = badge;
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = accent;
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(0, 0, radius - 7, 0, Math.PI * 2);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(244, 232, 189, 0.52)';
    ctx.stroke();

    ctx.fillStyle = accent;
    ctx.strokeStyle = accent;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3.5;
    if (type === 'capital' || type === 'city') {
      ctx.fillRect(-15, -5, 30, 21);
      ctx.fillRect(-22, -14, 11, 30);
      ctx.fillRect(11, -14, 11, 30);
      ctx.beginPath();
      ctx.moveTo(-23, -14);
      ctx.lineTo(-16.5, -24);
      ctx.lineTo(-10, -14);
      ctx.moveTo(10, -14);
      ctx.lineTo(16.5, -24);
      ctx.lineTo(23, -14);
      ctx.stroke();
      ctx.fillStyle = '#10252d';
      ctx.fillRect(-4, 5, 8, 11);
      ctx.fillRect(-19, -8, 4, 5);
      ctx.fillRect(15, -8, 4, 5);
      if (type === 'capital') {
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.moveTo(-8, -5);
        ctx.lineTo(0, -18);
        ctx.lineTo(8, -5);
        ctx.closePath();
        ctx.fill();
      }
    } else if (type === 'village') {
      ctx.beginPath();
      ctx.moveTo(-19, -2);
      ctx.lineTo(-5, -16);
      ctx.lineTo(9, -2);
      ctx.lineTo(6, -2);
      ctx.lineTo(6, 15);
      ctx.lineTo(-16, 15);
      ctx.lineTo(-16, -2);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(4, 5);
      ctx.lineTo(14, -5);
      ctx.lineTo(23, 5);
      ctx.lineTo(20, 5);
      ctx.lineTo(20, 16);
      ctx.lineTo(7, 16);
      ctx.lineTo(7, 5);
      ctx.closePath();
      ctx.fillStyle = 'rgba(226, 238, 218, 0.86)';
      ctx.fill();
      ctx.fillStyle = '#173039';
      ctx.fillRect(-8, 6, 6, 9);
      ctx.fillRect(12, 8, 4, 5);
      ctx.strokeStyle = 'rgba(240, 218, 154, 0.72)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-23, 21);
      ctx.quadraticCurveTo(0, 14, 24, 21);
      ctx.stroke();
    } else if (type === 'dungeon') {
      ctx.beginPath();
      ctx.arc(0, 7, 18, Math.PI, Math.PI * 2);
      ctx.lineTo(18, 19);
      ctx.lineTo(-18, 19);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#111b22';
      ctx.beginPath();
      ctx.arc(0, 8, 8, Math.PI, Math.PI * 2);
      ctx.lineTo(8, 19);
      ctx.lineTo(-8, 19);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(239, 226, 195, 0.5)';
      ctx.lineWidth = 2;
      for (const offset of [-12, -6, 6, 12]) {
        ctx.beginPath();
        ctx.moveTo(offset, 0);
        ctx.lineTo(offset * 1.22, 8);
        ctx.stroke();
      }
      for (let step = 0; step < 3; step++) {
        ctx.beginPath();
        ctx.moveTo(-22 + step * 3, 21 + step * 4);
        ctx.lineTo(22 - step * 3, 21 + step * 4);
        ctx.stroke();
      }
    } else {
      ctx.strokeStyle = 'rgba(237, 226, 188, 0.72)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 24, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      for (let point = 0; point < 12; point++) {
        const angle = (point * Math.PI) / 6 - Math.PI / 2;
        const starRadius = point % 2 === 0 ? 22 : 7;
        const px = Math.cos(angle) * starRadius;
        const py = Math.sin(angle) * starRadius;
        if (point === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#193038';
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };

  const drawCastlesAndCities = (ctx: CanvasRenderingContext2D) => {
    for (const landmark of landmarks) {
      drawLandmarkIcon(ctx, landmark);
      ctx.save();
      ctx.textAlign = 'center';
      ctx.font = '700 25px Georgia, serif';
      const nameWidth = ctx.measureText(landmark.name).width + 24;
      ctx.fillStyle = 'rgba(222, 205, 155, 0.76)';
      ctx.beginPath();
      ctx.roundRect(landmark.x - nameWidth / 2, landmark.y - 72, nameWidth, 32, 10);
      ctx.fill();
      ctx.strokeStyle = 'rgba(78, 65, 42, 0.38)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#29271f';
      ctx.fillText(landmark.name, landmark.x, landmark.y - 49);

      ctx.font = 'italic 17px Georgia, serif';
      const subtitleWidth = ctx.measureText(landmark.subtitle).width + 20;
      ctx.fillStyle = 'rgba(205, 188, 139, 0.62)';
      ctx.beginPath();
      ctx.roundRect(landmark.x - subtitleWidth / 2, landmark.y + 42, subtitleWidth, 27, 9);
      ctx.fill();
      ctx.fillStyle = 'rgba(48, 45, 34, 0.9)';
      ctx.fillText(landmark.subtitle, landmark.x, landmark.y + 61);
      ctx.restore();
    }
  };

  const drawSeaLabels = (ctx: CanvasRenderingContext2D) => {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(232, 216, 173, 0.48)';
    ctx.font = 'italic 22px Georgia, serif';
    ctx.fillText('The Shimmering Expanse', 385, 760);
    ctx.fillText('Sea of Lanterns', 2730, 1760);
    ctx.restore();
  };

  const isPointOnLand = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    traceMainland(ctx);
    if (!ctx.isPointInPath(x, y)) return false;
    if (isPointInMountain(x, y)) return false;
    if (isPointInRiver(x, y) && !isPointOnBridge(x, y)) return false;
    for (const lake of [...lakes, ...frozenLakes]) {
      traceTerrainFeature(ctx, lake);
      if (ctx.isPointInPath(x, y)) return false;
    }
    return true;
  };

  return {
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
  };
}
