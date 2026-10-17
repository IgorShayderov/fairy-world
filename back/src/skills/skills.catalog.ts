export const PLAYER_CLASSES = ['WARRIOR', 'SCOUT', 'MAGE'] as const;
export type PlayerClass = (typeof PLAYER_CLASSES)[number];
export type SkillEffect = 'slash' | 'heal' | 'shockwave' | 'arrow' | 'pierce' | 'volley' | 'fire' | 'ice' | 'arcane';
export interface SkillDefinition {
  id: string;
  class: PlayerClass;
  name: string;
  description: string;
  icon: string;
  tier: number;
  branch: number;
  maxRank: number;
  requiredLevel: number;
  prerequisite?: string;
  prerequisiteRank?: number;
  stat?: 'DAMAGE' | 'DEFENSE' | 'HEALTH' | 'DODGE' | 'MANA';
  percentPerRank?: number;
  effect?: SkillEffect;
  canCrit?: boolean;
  manaCost?: number;
  cooldown?: number;
  range?: number;
  multiplier?: number;
}

// Each branch is a progression, not six independent buttons. Costs are always one point per rank.
export const SKILLS: readonly SkillDefinition[] = [
  {
    id: 'warrior-might',
    class: 'WARRIOR',
    name: 'Might',
    description: '+2% damage per rank.',
    icon: 'fitness_center',
    tier: 1,
    branch: 0,
    maxRank: 20,
    requiredLevel: 1,
    stat: 'DAMAGE',
    percentPerRank: 2,
  },
  {
    id: 'warrior-cleave',
    class: 'WARRIOR',
    name: 'Cleave',
    description: 'A heavy melee cut: 140% damage, +4% per additional rank.',
    icon: 'sports_martial_arts',
    tier: 1,
    branch: 1,
    maxRank: 20,
    requiredLevel: 1,
    effect: 'slash',
    canCrit: true,
    manaCost: 16,
    cooldown: 2,
    range: 1,
    multiplier: 1.4,
  },
  {
    id: 'warrior-armor',
    class: 'WARRIOR',
    name: 'Iron Will',
    description: '+3% defense rating per rank.',
    icon: 'shield',
    tier: 2,
    branch: 0,
    maxRank: 20,
    requiredLevel: 5,
    prerequisite: 'warrior-might',
    prerequisiteRank: 3,
    stat: 'DEFENSE',
    percentPerRank: 3,
  },
  {
    id: 'warrior-recovery',
    class: 'WARRIOR',
    name: 'Second Wind',
    description: 'Restore 15% maximum HP, +1% per additional rank. Consumes your attack.',
    icon: 'favorite',
    tier: 2,
    branch: 1,
    maxRank: 20,
    requiredLevel: 5,
    prerequisite: 'warrior-cleave',
    prerequisiteRank: 3,
    effect: 'heal',
    manaCost: 32,
    cooldown: 4,
    range: 0,
  },
  {
    id: 'warrior-vitality',
    class: 'WARRIOR',
    name: 'Titan Blood',
    description: '+2% maximum health per rank.',
    icon: 'health_and_safety',
    tier: 3,
    branch: 0,
    maxRank: 20,
    requiredLevel: 10,
    prerequisite: 'warrior-armor',
    prerequisiteRank: 5,
    stat: 'HEALTH',
    percentPerRank: 2,
  },
  {
    id: 'warrior-slam',
    class: 'WARRIOR',
    name: 'Earthshatter',
    description: 'A melee shockwave: 190% damage, +4% per additional rank.',
    icon: 'landslide',
    tier: 3,
    branch: 1,
    maxRank: 20,
    requiredLevel: 10,
    prerequisite: 'warrior-recovery',
    prerequisiteRank: 5,
    effect: 'shockwave',
    manaCost: 48,
    cooldown: 4,
    range: 1,
    multiplier: 1.9,
  },
  {
    id: 'scout-precision',
    class: 'SCOUT',
    name: 'Precision',
    description: '+2% damage per rank while using a bow or crossbow with matching ammunition.',
    icon: 'my_location',
    tier: 1,
    branch: 0,
    maxRank: 20,
    requiredLevel: 1,
    stat: 'DAMAGE',
    percentPerRank: 2,
  },
  {
    id: 'scout-aim',
    class: 'SCOUT',
    name: 'Aimed Shot',
    description: 'A focused shot: 145% damage, +4% per additional rank. Requires matching ammunition.',
    icon: 'gps_fixed',
    tier: 1,
    branch: 1,
    maxRank: 20,
    requiredLevel: 1,
    effect: 'arrow',
    canCrit: true,
    manaCost: 16,
    cooldown: 2,
    multiplier: 1.45,
  },
  {
    id: 'scout-evasion',
    class: 'SCOUT',
    name: 'Evasion',
    description: '+3% dodge rating per rank.',
    icon: 'air',
    tier: 2,
    branch: 0,
    maxRank: 20,
    requiredLevel: 5,
    prerequisite: 'scout-precision',
    prerequisiteRank: 3,
    stat: 'DODGE',
    percentPerRank: 3,
  },
  {
    id: 'scout-pierce',
    class: 'SCOUT',
    name: 'Piercing Shot',
    description: '130% damage, +4% per additional rank. Ignores half the enemy defense.',
    icon: 'north_east',
    tier: 2,
    branch: 1,
    maxRank: 20,
    requiredLevel: 5,
    prerequisite: 'scout-aim',
    prerequisiteRank: 3,
    effect: 'pierce',
    canCrit: true,
    manaCost: 32,
    cooldown: 3,
    multiplier: 1.3,
  },
  {
    id: 'scout-survival',
    class: 'SCOUT',
    name: 'Survivalist',
    description: '+2% maximum health per rank.',
    icon: 'forest',
    tier: 3,
    branch: 0,
    maxRank: 20,
    requiredLevel: 10,
    prerequisite: 'scout-evasion',
    prerequisiteRank: 5,
    stat: 'HEALTH',
    percentPerRank: 2,
  },
  {
    id: 'scout-volley',
    class: 'SCOUT',
    name: 'Arrow Storm',
    description: 'A concentrated volley: 200% damage, +4% per additional rank.',
    icon: 'keyboard_double_arrow_right',
    tier: 3,
    branch: 1,
    maxRank: 20,
    requiredLevel: 10,
    prerequisite: 'scout-pierce',
    prerequisiteRank: 5,
    effect: 'volley',
    manaCost: 52,
    cooldown: 4,
    multiplier: 2,
  },
  {
    id: 'mage-focus',
    class: 'MAGE',
    name: 'Arcane Focus',
    description: '+3% spell damage per rank. Does not increase weapon attacks.',
    icon: 'auto_awesome',
    tier: 1,
    branch: 0,
    maxRank: 20,
    requiredLevel: 1,
  },
  {
    id: 'mage-fireball',
    class: 'MAGE',
    name: 'Fireball',
    description: '140% spell power, +4% per additional rank. Spell power uses level and Wisdom, not your weapon.',
    icon: 'local_fire_department',
    tier: 1,
    branch: 1,
    maxRank: 20,
    requiredLevel: 1,
    effect: 'fire',
    manaCost: 20,
    cooldown: 1,
    range: 6,
    multiplier: 1.4,
  },
  {
    id: 'mage-reservoir',
    class: 'MAGE',
    name: 'Mana Reservoir',
    description: '+3% maximum mana per rank.',
    icon: 'water_drop',
    tier: 2,
    branch: 0,
    maxRank: 20,
    requiredLevel: 5,
    prerequisite: 'mage-focus',
    prerequisiteRank: 3,
    stat: 'MANA',
    percentPerRank: 3,
  },
  {
    id: 'mage-frost',
    class: 'MAGE',
    name: 'Frost Lance',
    description:
      '120% spell power, +4% per additional rank. Reduces enemy movement by 2 for its next turn (minimum 1).',
    icon: 'ac_unit',
    tier: 2,
    branch: 1,
    maxRank: 20,
    requiredLevel: 5,
    prerequisite: 'mage-fireball',
    prerequisiteRank: 3,
    effect: 'ice',
    manaCost: 36,
    cooldown: 3,
    range: 6,
    multiplier: 1.2,
  },
  {
    id: 'mage-ward',
    class: 'MAGE',
    name: 'Runic Ward',
    description: '+3% defense rating per rank.',
    icon: 'security',
    tier: 3,
    branch: 0,
    maxRank: 20,
    requiredLevel: 10,
    prerequisite: 'mage-reservoir',
    prerequisiteRank: 5,
    stat: 'DEFENSE',
    percentPerRank: 3,
  },
  {
    id: 'mage-nova',
    class: 'MAGE',
    name: 'Arcane Nova',
    description: '210% spell power, +4% per additional rank. Ignores half the enemy defense.',
    icon: 'flare',
    tier: 3,
    branch: 1,
    maxRank: 20,
    requiredLevel: 10,
    prerequisite: 'mage-frost',
    prerequisiteRank: 5,
    effect: 'arcane',
    manaCost: 60,
    cooldown: 4,
    range: 5,
    multiplier: 2.1,
  },
];

export function skillRanks(playerClass: string | null | undefined, value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const raw = value as Record<string, unknown>;
  return Object.fromEntries(
    SKILLS.filter((skill) => skill.class === playerClass).flatMap((skill) => {
      const rank = raw[skill.id];
      return typeof rank === 'number' && Number.isInteger(rank) && rank > 0 && rank <= skill.maxRank
        ? [[skill.id, rank]]
        : [];
    }),
  );
}

export function skillPoints(level: number, ranks: Record<string, number>) {
  const spent = Object.values(ranks).reduce((sum, rank) => sum + rank, 0);
  return { total: level, spent, available: Math.max(0, level - spent) };
}

export function upgradeError(
  skill: SkillDefinition | undefined,
  playerClass: string,
  level: number,
  ranks: Record<string, number>,
): string | null {
  if (!skill || skill.class !== playerClass) return 'Choose a skill from your class';
  if ((ranks[skill.id] ?? 0) >= skill.maxRank) return 'Skill is already at maximum rank';
  if (level < skill.requiredLevel) return `Requires level ${skill.requiredLevel}`;
  if (skill.prerequisite && (ranks[skill.prerequisite] ?? 0) < (skill.prerequisiteRank ?? 1))
    return 'Learn the prerequisite skill first';
  if (skillPoints(level, ranks).available < 1) return 'No skill points available';
  return null;
}
