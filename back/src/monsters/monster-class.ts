export type MonsterClass = 'TANK' | 'MAGE' | 'FIGHTER';

const TANKS = new Set([
  'Bone Knight',
  'Forest Troll',
  'Stone Golem',
  'Frost Giant',
  'Bog Lurker',
  'Cinder Stone Brute',
  'Ossuary Colossus',
  'Glacier Troll',
  'Icebound Sovereign',
  'Bonebound Knight',
]);
const MAGES = new Set([
  'Goblin Hexer',
  'Ash Invoker',
  'Frost Revenant',
  'Void Wraith',
  'Drowned Siren',
  'Mire Hag',
  'Ember Wraith',
  'Veilbound Hexer',
  'Frost Wraith',
  'Plague Seer',
  'Warden of the First Flame',
  'The Hollow King',
  'The Raven Lich',
]);

export function monsterClass(type: string): MonsterClass {
  return TANKS.has(type) ? 'TANK' : MAGES.has(type) ? 'MAGE' : 'FIGHTER';
}

export function monsterDefenseCap(type: string): number {
  return monsterClass(type) === 'TANK' ? 65 : 50;
}

export function monsterDodgeCap(type: string): number {
  return monsterClass(type) === 'TANK' ? 25 : 30;
}
