import { BadRequestException } from '@nestjs/common';

export const encounterLandmarks = {
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
