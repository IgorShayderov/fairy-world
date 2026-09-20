import { AttributeType, StatType } from '../../generated/client';

export const STARTING_ATTRIBUTE_VALUE = 5;
export const STARTING_FREE_ATTRIBUTES = 0;
export const MAX_INVENTORY_SLOTS = 24;
export const MAX_CHANCE_PERCENT = 50;
export const BASE_CRITICAL_DAMAGE_PERCENT = 150;
export const MAX_CRITICAL_DAMAGE_PERCENT = 300;
const CRITICAL_DAMAGE_RATING_PIVOT = 6;

const roundPercentage = (value: number) => Math.round(value * 10) / 10;

export const convertRatingToPercentage = (stat: StatType, rating: number, level: number): number => {
  const nonNegativeRating = Math.max(0, rating);
  const scaledRating = (nonNegativeRating * 20) / Math.max(35, level);

  if (stat === StatType.CRIT || stat === StatType.DODGE) {
    return roundPercentage(Math.min(MAX_CHANCE_PERCENT, scaledRating));
  }
  if (stat === StatType.CRIT_DAMAGE) {
    const effectiveRating = (nonNegativeRating * 15) / Math.max(70, level);
    const availableBonus = MAX_CRITICAL_DAMAGE_PERCENT - BASE_CRITICAL_DAMAGE_PERCENT;
    const diminishingBonus = (availableBonus * effectiveRating) / (effectiveRating + CRITICAL_DAMAGE_RATING_PIVOT);
    return roundPercentage(Math.min(MAX_CRITICAL_DAMAGE_PERCENT, BASE_CRITICAL_DAMAGE_PERCENT + diminishingBonus));
  }
  if (stat === StatType.DEFENSE) {
    const levelPressure = Math.max(7, level) * 10;
    const percentage = (nonNegativeRating / (nonNegativeRating + levelPressure)) * 100;
    return roundPercentage(Math.min(50, percentage));
  }

  return rating;
};

export const STARTING_PROPERTIES: Record<StatType, number> = {
  [StatType.HEALTH]: 50,
  [StatType.MANA]: 10,
  [StatType.DAMAGE]: 1,
  [StatType.DEFENSE]: 0,
  [StatType.CRIT]: 0,
  [StatType.DODGE]: 0,
  [StatType.CRIT_DAMAGE]: 0,
};

export const ATTRIBUTE_EFFECTS: Record<
  AttributeType,
  { description: string; properties: Partial<Record<StatType, number>> }
> = {
  [AttributeType.STRENGTH]: {
    description: 'Increases Damage by 1 per point.',
    properties: { [StatType.DAMAGE]: 1 },
  },
  [AttributeType.AGILITY]: {
    description: 'Adds 1 Dodge and 1 Critical Chance rating per point. Final percentages scale with level.',
    properties: { [StatType.DODGE]: 1, [StatType.CRIT]: 1 },
  },
  [AttributeType.ENDURANCE]: {
    description: 'Increases Health by 10 and Defense by 1 per point.',
    properties: { [StatType.HEALTH]: 10, [StatType.DEFENSE]: 1 },
  },
  [AttributeType.WISDOM]: {
    description: 'Increases Mana by 5 per point.',
    properties: { [StatType.MANA]: 5 },
  },
  [AttributeType.CHARISMA]: {
    description:
      'Increases Health by 5 and adds 1 Critical Damage rating per point. Its critical benefit scales with level and diminishing returns.',
    properties: { [StatType.HEALTH]: 5, [StatType.CRIT_DAMAGE]: 1 },
  },
};

export const PROPERTY_DESCRIPTIONS: Record<StatType, string> = {
  [StatType.HEALTH]: 'Maximum health points.',
  [StatType.MANA]: 'Maximum mana points.',
  [StatType.DAMAGE]: 'Base damage dealt by attacks.',
  [StatType.DEFENSE]: 'Final damage reduction percentage, scaled against the player level.',
  [StatType.CRIT]: 'Final critical-hit chance, capped at 50%.',
  [StatType.DODGE]: 'Final chance to avoid an attack, capped at 50%.',
  [StatType.CRIT_DAMAGE]: 'Final critical-hit damage multiplier, from a 150% base up to a 300% maximum.',
};
