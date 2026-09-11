const RARITY_TEXT_CLASSES: Record<string, string> = {
  QUEST: 'text-amber-600',
  COMMON: 'text-gray-500',
  MAGIC: 'text-blue-600',
  RARE: 'text-purple-600',
  UNIQUE: 'text-orange-600',
};

const RARITY_BADGE_CLASSES: Record<string, string> = {
  QUEST: 'bg-amber-100 text-amber-800',
  COMMON: 'bg-gray-100 text-gray-700',
  MAGIC: 'bg-blue-100 text-blue-700',
  RARE: 'bg-purple-100 text-purple-700',
  UNIQUE: 'bg-orange-100 text-orange-700',
};

export const getRarityTextClass = (rarity?: string): string =>
  RARITY_TEXT_CLASSES[rarity?.toUpperCase() ?? ''] ?? 'text-gray-500';

export const getRarityBadgeClass = (rarity?: string): string =>
  RARITY_BADGE_CLASSES[rarity?.toUpperCase() ?? ''] ?? 'bg-gray-100 text-gray-700';

export const removeRarityPrefix = (description: string, rarity: string): string => {
  const prefix = `${rarity} `;
  return description.toUpperCase().startsWith(prefix) ? description.slice(prefix.length) : description;
};
