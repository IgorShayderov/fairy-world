import type { InventoryItemType } from '@/modules/Inventory/types';

export const isPotion = (
  item?: InventoryItemType | { equipmentType?: string[]; equipmentTypes?: string[] } | null
): boolean => {
  if (!item) return false;
  return (item.equipmentType ?? item.equipmentTypes ?? []).includes('POTION');
};

export const isHealthPotion = (item: InventoryItemType): boolean =>
  isPotion(item) && (item.name ?? item.nameKey ?? '').includes('Health Potion');

export const POTION_REQUIRED_LEVELS: Record<string, number> = {
  'Lesser Experience Potion': 10,
  'Lesser Attack Potion': 10,
  'Lesser Defense Potion': 10,

  'Medium Experience Potion': 20,
  'Medium Attack Potion': 20,
  'Medium Defense Potion': 20,
  'Moderate Experience Potion': 20,
  'Moderate Attack Potion': 20,
  'Moderate Defense Potion': 20,

  'Mild Experience Potion': 30,
  'Mild Attack Potion': 30,
  'Mild Defense Potion': 30,
  'Free Attribute Potion': 30,

  'Greater Experience Potion': 40,
  'Greater Attack Potion': 40,
  'Greater Defense Potion': 40,

  'Higher Experience Potion': 50,
  'Higher Attack Potion': 50,
  'Higher Defense Potion': 50,
};

export const getPotionRequiredLevel = (name?: string): number =>
  (name ? POTION_REQUIRED_LEVELS[name] ?? 1 : 1);

export type PotionCategory = 'ATTACK' | 'DEFENSE' | 'EXPERIENCE' | 'FREE_ATTRIBUTE' | 'HEALTH' | 'UNKNOWN';

export interface PotionColorScheme {
  category: PotionCategory;
  liquidTop: string;
  liquidBottom: string;
  surfaceGlow: string;
  glowColor: string;
}

export const getPotionCategory = (name?: string, description?: string): PotionCategory => {
  const text = `${name ?? ''} ${description ?? ''}`.toLowerCase();
  if (text.includes('free attribute') || text.includes('attribute point')) return 'FREE_ATTRIBUTE';
  if (text.includes('health') || text.includes('heal')) return 'HEALTH';
  if (text.includes('attack') || text.includes('damage')) return 'ATTACK';
  if (text.includes('defense')) return 'DEFENSE';
  if (text.includes('experience')) return 'EXPERIENCE';
  return 'UNKNOWN';
};

export const getPotionTier = (name?: string, level?: number): number => {
  const n = (name ?? '').toLowerCase();
  if (n.includes('higher') || (level ?? 0) >= 50) return 5;
  if (n.includes('greater') || (level ?? 0) >= 40) return 4;
  if (n.includes('mild') || n.includes('free attribute') || (level ?? 0) >= 30) return 3;
  if (n.includes('medium') || n.includes('moderate') || (level ?? 0) >= 20) return 2;
  return 1;
};

const CATEGORY_COLORS: Record<PotionCategory, Omit<PotionColorScheme, 'category'>> = {
  ATTACK: {
    liquidTop: '#facc15',
    liquidBottom: '#a16207',
    surfaceGlow: '#fef08a',
    glowColor: 'rgba(250, 204, 21, 0.45)',
  },
  DEFENSE: {
    liquidTop: '#38bdf8',
    liquidBottom: '#1d4ed8',
    surfaceGlow: '#bae6fd',
    glowColor: 'rgba(56, 189, 248, 0.45)',
  },
  EXPERIENCE: {
    liquidTop: '#22c55e',
    liquidBottom: '#15803d',
    surfaceGlow: '#86efac',
    glowColor: 'rgba(34, 197, 94, 0.45)',
  },
  FREE_ATTRIBUTE: {
    liquidTop: '#c084fc',
    liquidBottom: '#6b21a8',
    surfaceGlow: '#f3e8ff',
    glowColor: 'rgba(192, 132, 252, 0.5)',
  },
  HEALTH: {
    liquidTop: '#ef4444',
    liquidBottom: '#b91c1c',
    surfaceGlow: '#fecaca',
    glowColor: 'rgba(239, 68, 68, 0.5)',
  },
  UNKNOWN: {
    liquidTop: '#38bdf8',
    liquidBottom: '#0369a1',
    surfaceGlow: '#bae6fd',
    glowColor: 'rgba(56, 189, 248, 0.4)',
  },
};

export const getPotionColorSchemeForCategory = (category: PotionCategory): PotionColorScheme => ({
  category,
  ...CATEGORY_COLORS[category],
});

export const getPotionColorScheme = (
  item?: { name?: string; nameKey?: string; tooltipName?: string; description?: string; level?: number } | null
): PotionColorScheme => {
  const name = item?.tooltipName ?? item?.name ?? item?.nameKey ?? '';
  const category = getPotionCategory(name, item?.description);
  return getPotionColorSchemeForCategory(category);
};
