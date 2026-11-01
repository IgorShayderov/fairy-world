export const PLAYER_CLASSES = ['WARRIOR', 'SCOUT', 'MAGE'] as const;
export type PlayerClass = (typeof PLAYER_CLASSES)[number];
export type SkillEffect =
  | 'slash'
  | 'heal'
  | 'empower'
  | 'shockwave'
  | 'arrow'
  | 'pierce'
  | 'volley'
  | 'fire'
  | 'ice'
  | 'arcane'
  | 'frost-arrow'
  | 'poison';

export function isMagicSpell(effect: SkillEffect | undefined): boolean {
  return effect === 'fire' || effect === 'ice' || effect === 'arcane';
}
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
  flatBonusesPerRank?: Partial<Record<'DEFENSE', number>>;
  percentagePointsPerRank?: Partial<Record<'CRIT' | 'CRIT_DAMAGE', number>>;
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
    description: '+3% damage per rank.',
    icon: 'fitness_center',
    tier: 1,
    branch: 0,
    maxRank: 20,
    requiredLevel: 1,
    stat: 'DAMAGE',
    percentPerRank: 3,
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
    manaCost: 24,
    cooldown: 2,
    range: 1,
    multiplier: 1.4,
  },
  {
    id: 'warrior-armor',
    class: 'WARRIOR',
    name: 'Iron Will',
    description: '+5% defense rating per rank.',
    icon: 'shield',
    tier: 2,
    branch: 0,
    maxRank: 20,
    requiredLevel: 5,
    prerequisite: 'warrior-might',
    prerequisiteRank: 3,
    stat: 'DEFENSE',
    percentPerRank: 5,
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
    manaCost: 48,
    cooldown: 4,
    range: 0,
  },
  {
    id: 'warrior-vitality',
    class: 'WARRIOR',
    name: 'Titan Blood',
    description: '+5% maximum health and +2 defense rating per rank.',
    icon: 'health_and_safety',
    tier: 3,
    branch: 0,
    maxRank: 20,
    requiredLevel: 10,
    prerequisite: 'warrior-armor',
    prerequisiteRank: 5,
    stat: 'HEALTH',
    percentPerRank: 5,
    flatBonusesPerRank: { DEFENSE: 2 },
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
    manaCost: 72,
    cooldown: 4,
    range: 1,
    multiplier: 1.9,
  },
  {
    id: 'scout-precision',
    class: 'SCOUT',
    name: 'Precision',
    description: '+3% damage per rank while using a bow or crossbow with matching ammunition.',
    icon: 'my_location',
    tier: 1,
    branch: 0,
    maxRank: 20,
    requiredLevel: 1,
    stat: 'DAMAGE',
    percentPerRank: 3,
  },
  {
    id: 'scout-aim',
    class: 'SCOUT',
    name: 'Frost Arrow',
    description:
      '90% weapon damage. On hit, slows movement by 2 hexes for 3 enemy turns (minimum 1). +1 slow per 5 additional ranks. Requires matching ammunition. Cannot crit.',
    icon: 'ac_unit',
    tier: 1,
    branch: 1,
    maxRank: 20,
    requiredLevel: 1,
    effect: 'frost-arrow',
    manaCost: 24,
    cooldown: 2,
    multiplier: 0.9,
  },
  {
    id: 'scout-evasion',
    class: 'SCOUT',
    name: 'Deadly Precision',
    description: '+3 percentage points of critical damage and +1 percentage point of critical chance per rank.',
    icon: 'gps_fixed',
    tier: 2,
    branch: 0,
    maxRank: 20,
    requiredLevel: 5,
    prerequisite: 'scout-precision',
    prerequisiteRank: 3,
    percentagePointsPerRank: { CRIT_DAMAGE: 3, CRIT: 1 },
  },
  {
    id: 'scout-pierce',
    class: 'SCOUT',
    name: 'Piercing Shot',
    description:
      '100% weapon damage. On hit, reduces enemy armor by 30% for the next 3 successful hits. +1% armor reduction per additional rank. Does not stack. Cannot crit.',
    icon: 'broken_image',
    tier: 2,
    branch: 1,
    maxRank: 20,
    requiredLevel: 5,
    prerequisite: 'scout-aim',
    prerequisiteRank: 3,
    effect: 'pierce',
    manaCost: 48,
    cooldown: 3,
    multiplier: 1,
  },
  {
    id: 'scout-survival',
    class: 'SCOUT',
    name: 'Survivalist',
    description: '+5% maximum health and +2 defense rating per rank.',
    icon: 'forest',
    tier: 3,
    branch: 0,
    maxRank: 20,
    requiredLevel: 10,
    prerequisite: 'scout-evasion',
    prerequisiteRank: 5,
    stat: 'HEALTH',
    percentPerRank: 5,
    flatBonusesPerRank: { DEFENSE: 2 },
  },
  {
    id: 'scout-volley',
    class: 'SCOUT',
    name: 'Poisoned Arrow',
    description:
      '80% weapon damage. On hit, 35% chance to petrify the enemy, preventing movement and attack on its next turn. +2% chance per additional rank. Cannot crit.',
    icon: 'science',
    tier: 3,
    branch: 1,
    maxRank: 20,
    requiredLevel: 10,
    prerequisite: 'scout-pierce',
    prerequisiteRank: 5,
    effect: 'poison',
    manaCost: 78,
    cooldown: 4,
    multiplier: 0.8,
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
    description:
      '140% spell power, +4% per additional rank. Ignores defense. Spell power uses level and Wisdom, not your weapon.',
    icon: 'local_fire_department',
    tier: 1,
    branch: 1,
    maxRank: 20,
    requiredLevel: 1,
    effect: 'fire',
    manaCost: 30,
    cooldown: 1,
    range: 6,
    multiplier: 1.4,
  },
  {
    id: 'mage-reservoir',
    class: 'MAGE',
    name: 'Mana Reservoir',
    description: '+5% maximum mana per rank.',
    icon: 'water_drop',
    tier: 2,
    branch: 0,
    maxRank: 20,
    requiredLevel: 5,
    prerequisite: 'mage-focus',
    prerequisiteRank: 3,
    stat: 'MANA',
    percentPerRank: 5,
  },
  {
    id: 'mage-frost',
    class: 'MAGE',
    name: 'Frost Lance',
    description:
      '120% spell power, +4% per additional rank. Ignores defense. Reduces enemy movement by 2 for its next turn (minimum 1).',
    icon: 'ac_unit',
    tier: 2,
    branch: 1,
    maxRank: 20,
    requiredLevel: 5,
    prerequisite: 'mage-fireball',
    prerequisiteRank: 3,
    effect: 'ice',
    manaCost: 54,
    cooldown: 3,
    range: 6,
    multiplier: 1.2,
  },
  {
    id: 'mage-ward',
    class: 'MAGE',
    name: 'Runic Ward',
    description: '+5% defense rating and +2 defense rating per rank.',
    icon: 'security',
    tier: 3,
    branch: 0,
    maxRank: 20,
    requiredLevel: 10,
    prerequisite: 'mage-reservoir',
    prerequisiteRank: 5,
    stat: 'DEFENSE',
    percentPerRank: 5,
    flatBonusesPerRank: { DEFENSE: 2 },
  },
  {
    id: 'mage-nova',
    class: 'MAGE',
    name: 'Arcane Nova',
    description: '210% spell power, +4% per additional rank. Ignores defense.',
    icon: 'flare',
    tier: 3,
    branch: 1,
    maxRank: 20,
    requiredLevel: 10,
    prerequisite: 'mage-frost',
    prerequisiteRank: 5,
    effect: 'arcane',
    manaCost: 90,
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
