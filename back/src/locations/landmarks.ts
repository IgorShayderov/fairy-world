import { BadRequestException } from '@nestjs/common';

export const encounterLandmarks = {
  ICEVAULT: { x: 1770, y: 300, type: 'dungeon' },
  RAVENCRYPT: { x: 450, y: 350, type: 'dungeon' },
  SUNSPIRE: { x: 1200, y: 330, type: 'sanctum' },
  EMBERDEEP: { x: 2470, y: 1370, type: 'dungeon' },
  HOLLOWGATE: { x: 2680, y: 1040, type: 'dungeon' },
  STARGLEN: { x: 720, y: 1480, type: 'sanctum' },
  DAWNSHRINE: { x: 2240, y: 1540, type: 'sanctum' },
} as const;

export function requireLandmark(
  name: string,
  type: 'dungeon' | 'sanctum',
  profile: { mapPositionX: number; mapPositionY: number },
) {
  const landmark = encounterLandmarks[name as keyof typeof encounterLandmarks];
  if (!landmark || landmark.type !== type) throw new BadRequestException('Unknown landmark');
  const distance = Math.hypot(profile.mapPositionX - landmark.x, profile.mapPositionY - landmark.y);
  if (!Number.isFinite(distance) || distance > 85) {
    throw new BadRequestException('Travel to this landmark first');
  }
  return landmark;
}
