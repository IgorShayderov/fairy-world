export const TOWNS = [
  { shopId: 1, name: 'EVERCROSS', x: 1470, y: 1040 },
  { shopId: 2, name: 'AURELIA', x: 940, y: 620 },
  { shopId: 3, name: 'MOONFALL', x: 2060, y: 570 },
  { shopId: 4, name: 'MOSSKEEP', x: 1720, y: 1640 },
  { shopId: 5, name: 'WESTMERE', x: 520, y: 850 },
  { shopId: 6, name: 'FROSTWATCH', x: 2530, y: 520 },
  { shopId: 7, name: 'LARKHAVEN', x: 1120, y: 1580 },
] as const;

export const townAt = (profile: { mapPositionX: number; mapPositionY: number }) =>
  TOWNS.find((town) => Math.hypot(profile.mapPositionX - town.x, profile.mapPositionY - town.y) <= 70);
