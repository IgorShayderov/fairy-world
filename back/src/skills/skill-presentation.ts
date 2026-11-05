import { skillBaseManaCost, skillDamageMultiplier, type SkillDefinition } from './skills.catalog';

type Metric = { label: string; value: string };
const percent = (value: number) => `${Math.round(value * 100) / 100}%`;

function metrics(skill: SkillDefinition, rank: number): Metric[] {
  const rows: Metric[] = [];
  if (skill.effect) {
    if (skill.effect === 'heal') rows.push({ label: 'Maximum HP restored', value: percent(15 + rank - 1) });
    else
      rows.push({
        label: skill.class === 'MAGE' ? 'Spell power damage' : 'Weapon damage',
        value: percent(skillDamageMultiplier(skill, rank) * 100),
      });
    if (skill.id === 'scout-aim')
      rows.push({ label: 'Movement reduction', value: `${2 + Math.floor((rank - 1) / 5)} hexes` });
    if (skill.id === 'scout-pierce') rows.push({ label: 'Armor reduction', value: percent(30 + rank - 1) });
    if (skill.id === 'scout-volley') rows.push({ label: 'Petrification chance', value: percent(35 + (rank - 1) * 2) });
    if (skill.id === 'mage-frost') rows.push({ label: 'Movement reduction', value: '2 hexes' });
    rows.push({ label: 'Mana cost (before discounts)', value: String(skillBaseManaCost(skill, rank)) });
    rows.push({ label: 'Cooldown', value: `${skill.cooldown} turn${skill.cooldown === 1 ? '' : 's'}` });
  } else {
    const labels = {
      DAMAGE: 'Damage',
      DEFENSE: 'Defense rating',
      HEALTH: 'Maximum health',
      DODGE: 'Dodge rating',
      MANA: 'Maximum mana',
    };
    if (skill.stat && skill.percentPerRank)
      rows.push({ label: labels[skill.stat], value: `+${percent(skill.percentPerRank * rank)}` });
    if (skill.id === 'mage-focus') rows.push({ label: 'Spell damage', value: `+${percent(3 * rank)}` });
    if (skill.flatBonusesPerRank?.DEFENSE)
      rows.push({ label: 'Flat defense rating', value: `+${skill.flatBonusesPerRank.DEFENSE * rank}` });
    if (skill.percentagePointsPerRank?.CRIT_DAMAGE)
      rows.push({ label: 'Critical damage', value: `+${percent(skill.percentagePointsPerRank.CRIT_DAMAGE * rank)}` });
    if (skill.percentagePointsPerRank?.CRIT)
      rows.push({ label: 'Critical chance', value: `+${percent(skill.percentagePointsPerRank.CRIT * rank)}` });
  }
  return rows;
}

/** Describes the learned rank (or rank-one preview), never future-rank formulas. */
export function skillDescription(skill: SkillDefinition, rank: number): string {
  rank = Math.max(1, Math.min(skill.maxRank, rank));
  const damage = percent(skillDamageMultiplier(skill, rank) * 100);
  switch (skill.id) {
    case 'warrior-cleave':
      return `A heavy melee cut: ${damage} weapon damage.`;
    case 'warrior-slam':
      return `A melee shockwave: ${damage} weapon damage.`;
    case 'warrior-recovery':
      return `Restore ${percent(15 + rank - 1)} maximum HP. Consumes your attack.`;
    case 'scout-aim':
      return `${damage} weapon damage. Slows movement by ${2 + Math.floor((rank - 1) / 5)} hexes for 3 enemy turns (minimum 2). Requires matching ammunition. Cannot crit.`;
    case 'scout-pierce':
      return `${damage} weapon damage. Reduces enemy armor by ${percent(30 + rank - 1)} for the next 3 successful hits. Does not stack. Requires matching ammunition. Cannot crit.`;
    case 'scout-volley':
      return `${damage} weapon damage. ${percent(35 + (rank - 1) * 2)} chance to petrify the enemy, preventing movement and attack on its next turn. Requires matching ammunition. Cannot crit.`;
    case 'mage-fireball':
      return `${damage} spell power. Ignores defense. Spell power uses level and Wisdom, not your weapon.`;
    case 'mage-frost':
      return `${damage} spell power. Ignores defense. Reduces enemy movement by 2 for its next turn (minimum 2).`;
    case 'mage-nova':
      return `${damage} spell power. Ignores defense.`;
    default: {
      const bonuses = metrics(skill, rank)
        .map(({ label, value }) => `${value} ${label.toLowerCase()}`)
        .join(', ');
      const condition =
        skill.id === 'scout-precision'
          ? ' While using a bow or crossbow with matching ammunition.'
          : skill.id === 'mage-focus'
            ? ' Does not increase weapon attacks.'
            : '';
      return `${bonuses}.${condition}`;
    }
  }
}

export function skillPresentation(skill: SkillDefinition, rank: number) {
  const current = metrics(skill, Math.max(1, rank));
  return {
    description: skillDescription(skill, rank),
    ...(rank < skill.maxRank
      ? {
          nextRank: {
            rank: rank + 1,
            changes: metrics(skill, rank + 1).flatMap((entry) => {
              const before = rank ? (current.find(({ label }) => label === entry.label)?.value ?? null) : null;
              return before === entry.value ? [] : [{ label: entry.label, before, after: entry.value }];
            }),
          },
        }
      : {}),
  };
}
