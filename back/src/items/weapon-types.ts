export const isTwoHandedWeapon = (name?: string | null): boolean => {
  if (!name) return false;
  return name.toLowerCase().includes('two-handed');
};

export const rangedWeapon = (name?: string | null): 'BOW' | 'CROSSBOW' | null => {
  if (/\bcrossbow\b/i.test(name ?? '')) return 'CROSSBOW';
  if (/\bbow\b/i.test(name ?? '')) return 'BOW';
  return null;
};

export const matchingAmmunition = (weaponName: string, ammoName: string): boolean =>
  rangedWeapon(weaponName) === 'BOW'
    ? /\barrows\b/i.test(ammoName)
    : rangedWeapon(weaponName) === 'CROSSBOW' && /\bbolts\b/i.test(ammoName);
