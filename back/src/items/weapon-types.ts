export const isTwoHandedWeapon = (name?: string | null): boolean => {
  if (!name) return false;
  return name.toLowerCase().includes('two-handed');
};
