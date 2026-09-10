import { AttributeType, StatType } from '../../generated/client';

export const STARTING_ATTRIBUTE_VALUE = 5;
export const STARTING_FREE_ATTRIBUTES = 0;

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
    description: 'Increases Dodge and Critical chance by 0.5 per point.',
    properties: { [StatType.DODGE]: 0.5, [StatType.CRIT]: 0.5 },
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
    description: 'Increases Critical damage by 1 per point.',
    properties: { [StatType.CRIT_DAMAGE]: 1 },
  },
};

export const PROPERTY_DESCRIPTIONS: Record<StatType, string> = {
  [StatType.HEALTH]: 'Maximum health points.',
  [StatType.MANA]: 'Maximum mana points.',
  [StatType.DAMAGE]: 'Base damage dealt by attacks.',
  [StatType.DEFENSE]: 'Reduces incoming damage.',
  [StatType.CRIT]: 'Chance to land a critical hit.',
  [StatType.DODGE]: 'Chance to avoid an attack.',
  [StatType.CRIT_DAMAGE]: 'Additional damage dealt by critical hits.',
};
