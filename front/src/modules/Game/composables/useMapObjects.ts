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
  { x: 1470, y: 1040, name: 'EVERCROSS', subtitle: 'The Wandering Market', type: 'village', accent: '#efbd74' },
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
  road('EVERCROSS', 'MOONFALL'),
  road('MOONFALL', 'FROSTWATCH', { x: 2250, y: 535 }, { x: 2580, y: 535 }),
  road('FROSTWATCH', 'HOLLOWGATE', { x: 2770, y: 600 }, { x: 2850, y: 950 }),
  road('EVERCROSS', 'STARGLEN'),
  road('STARGLEN', 'LARKHAVEN'),
  road('EVERCROSS', 'LARKHAVEN'),
  road('LARKHAVEN', 'MOSSKEEP'),
  road('MOSSKEEP', 'DAWNSHRINE'),
  road('DAWNSHRINE', 'EMBERDEEP'),
];

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
    };
  }));
})();

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

    const islands = [
      { x: 285, y: 1230, rx: 72, ry: 118, angle: -0.35 },
      { x: 2980, y: 760, rx: 92, ry: 58, angle: 0.2 },
      { x: 2730, y: 1850, rx: 130, ry: 62, angle: -0.18 },
    ];
    for (const island of islands) {
      ctx.save();
      ctx.translate(island.x, island.y);
      ctx.rotate(island.angle);
      ctx.beginPath();
      ctx.ellipse(0, 0, island.rx, island.ry, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#c1ad7b';
      ctx.fill();
      ctx.lineWidth = 8;
      ctx.strokeStyle = 'rgba(227, 209, 155, 0.5)';
      ctx.stroke();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#675a42';
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = '#4c3e2c';
    const random = seededRandom(2048);
    for (let index = 0; index < 1800; index++) {
      ctx.fillRect(330 + random() * 2500, 260 + random() * 1540, 1.5, 1.5);
    }
    ctx.restore();
  };

  const drawRivers = (ctx: CanvasRenderingContext2D) => {
    const rivers: Point[][] = [
      [
        { x: 2130, y: 370 },
        { x: 2010, y: 620 },
        { x: 1840, y: 790 },
        { x: 1680, y: 980 },
        { x: 1470, y: 1040 },
        { x: 1260, y: 1220 },
        { x: 990, y: 1360 },
        { x: 690, y: 1660 },
      ],
      [
        { x: 1660, y: 980 },
        { x: 1840, y: 1130 },
        { x: 1900, y: 1380 },
        { x: 2060, y: 1740 },
      ],
    ];

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
      ctx.lineWidth = 10;
      ctx.strokeStyle = 'rgba(77, 53, 31, 0.28)';
      ctx.stroke();
      ctx.lineWidth = 4;
      ctx.setLineDash([14, 12]);
      ctx.strokeStyle = '#765633';
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.restore();
  };

  const drawMountain = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    ctx.moveTo(-size * 0.7, size * 0.34);
    ctx.lineTo(0, -size);
    ctx.lineTo(size * 0.78, size * 0.34);
    ctx.closePath();
    const rock = ctx.createLinearGradient(-size * 0.5, 0, size * 0.5, 0);
    rock.addColorStop(0, '#4b5352');
    rock.addColorStop(0.5, '#899087');
    rock.addColorStop(1, '#4d554f');
    ctx.fillStyle = rock;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#37423e';
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-size * 0.24, -size * 0.55);
    ctx.lineTo(0, -size);
    ctx.lineTo(size * 0.28, -size * 0.52);
    ctx.lineTo(size * 0.09, -size * 0.61);
    ctx.lineTo(-size * 0.04, -size * 0.45);
    ctx.closePath();
    ctx.fillStyle = '#e8eee8';
    ctx.fill();
    ctx.restore();
  };

  const drawMountainRanges = (ctx: CanvasRenderingContext2D) => {
    for (const mountain of mountains) drawMountain(ctx, mountain.x, mountain.y, mountain.size);

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
    const trees = Array.from({ length: count }, () => {
      const angle = random() * Math.PI * 2;
      const distance = Math.sqrt(random());
      return {
        x: centerX + Math.cos(angle) * radiusX * distance,
        y: centerY + Math.sin(angle) * radiusY * distance,
        size: 22 + random() * 24,
        color: colors[Math.floor(random() * colors.length)]!,
      };
    }).sort((a, b) => a.y - b.y);
    for (const tree of trees) drawTree(ctx, tree.x, tree.y, tree.size, tree.color);
  };

  const drawForests = (ctx: CanvasRenderingContext2D) => {
    drawForestCluster(ctx, 790, 1220, 330, 290, 150, 426, ['#244b3a', '#315d45', '#3d694e']);
    drawForestCluster(ctx, 1810, 1510, 390, 235, 175, 814, ['#2a4935', '#3d6244', '#496c49']);
    drawForestCluster(ctx, 2560, 1010, 180, 270, 80, 732, ['#314f45', '#426359', '#526f60']);

    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = 'italic 600 25px Georgia, serif';
    ctx.fillStyle = 'rgba(42, 64, 48, 0.78)';
    ctx.fillText('Whisperwood', 760, 920);
    ctx.fillText('The Elderwild', 1830, 1310);
    ctx.restore();
  };

  const drawLandmarkIcon = (ctx: CanvasRenderingContext2D, landmark: Landmark) => {
    const { x, y, type, accent } = landmark;
    ctx.save();
    ctx.translate(x, y);
    ctx.shadowColor = accent;
    ctx.shadowBlur = type === 'dungeon' || type === 'sanctum' ? 24 : 12;

    ctx.beginPath();
    ctx.arc(0, 0, 30, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(27, 33, 35, 0.88)';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = accent;
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.fillStyle = accent;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 4;
    if (type === 'capital' || type === 'city') {
      ctx.fillRect(-13, -7, 26, 21);
      ctx.fillRect(-19, -15, 9, 28);
      ctx.fillRect(10, -15, 9, 28);
      ctx.beginPath();
      ctx.moveTo(-20, -15);
      ctx.lineTo(-14.5, -24);
      ctx.lineTo(-9, -15);
      ctx.moveTo(9, -15);
      ctx.lineTo(14.5, -24);
      ctx.lineTo(20, -15);
      ctx.stroke();
    } else if (type === 'village') {
      ctx.beginPath();
      ctx.moveTo(-18, -3);
      ctx.lineTo(0, -19);
      ctx.lineTo(18, -3);
      ctx.lineTo(14, -3);
      ctx.lineTo(14, 16);
      ctx.lineTo(-14, 16);
      ctx.lineTo(-14, -3);
      ctx.closePath();
      ctx.fill();
    } else if (type === 'dungeon') {
      ctx.beginPath();
      ctx.arc(0, 6, 15, Math.PI, Math.PI * 2);
      ctx.lineTo(15, 17);
      ctx.lineTo(-15, 17);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#201d24';
      ctx.beginPath();
      ctx.arc(0, 7, 6, Math.PI, Math.PI * 2);
      ctx.lineTo(6, 17);
      ctx.lineTo(-6, 17);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.beginPath();
      for (let point = 0; point < 8; point++) {
        const angle = (point * Math.PI) / 4 - Math.PI / 2;
        const radius = point % 2 === 0 ? 21 : 8;
        const px = Math.cos(angle) * radius;
        const py = Math.sin(angle) * radius;
        if (point === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  };

  const drawCastlesAndCities = (ctx: CanvasRenderingContext2D) => {
    for (const landmark of landmarks) {
      drawLandmarkIcon(ctx, landmark);
      ctx.save();
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(224, 205, 154, 0.9)';
      ctx.shadowBlur = 5;
      ctx.fillStyle = '#29271f';
      ctx.font = '700 25px Georgia, serif';
      ctx.fillText(landmark.name, landmark.x, landmark.y - 49);
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(55, 51, 39, 0.82)';
      ctx.font = 'italic 17px Georgia, serif';
      ctx.fillText(landmark.subtitle, landmark.x, landmark.y + 55);
      ctx.restore();
    }
  };

  const drawCompass = (ctx: CanvasRenderingContext2D) => {
    ctx.save();
    ctx.translate(2860, 300);
    ctx.strokeStyle = 'rgba(229, 205, 147, 0.72)';
    ctx.fillStyle = 'rgba(18, 45, 51, 0.82)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, 92, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, 70, 0, Math.PI * 2);
    ctx.lineWidth = 1.5;
    ctx.stroke();

    for (let index = 0; index < 8; index++) {
      ctx.save();
      ctx.rotate((index * Math.PI) / 4);
      ctx.beginPath();
      ctx.moveTo(0, index % 2 === 0 ? -64 : -48);
      ctx.lineTo(-8, 0);
      ctx.lineTo(8, 0);
      ctx.closePath();
      ctx.fillStyle = index === 0 ? '#f0c56d' : index % 2 === 0 ? '#e6d9b5' : '#81959a';
      ctx.fill();
      ctx.restore();
    }

    ctx.fillStyle = '#f4ddb0';
    ctx.textAlign = 'center';
    ctx.font = '700 21px Georgia, serif';
    ctx.fillText('N', 0, -108);
    ctx.restore();

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
    return ctx.isPointInPath(x, y);
  };

  return {
    drawBackground,
    drawSea,
    drawRivers,
    drawRoads,
    drawMountainRanges,
    drawForests,
    drawCastlesAndCities,
    drawCompass,
    isPointOnLand,
  };
}
