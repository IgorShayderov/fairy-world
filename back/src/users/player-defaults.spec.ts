import { StatType } from '../../generated/client';
import {
  BASE_CRITICAL_DAMAGE_PERCENT,
  MAX_CHANCE_PERCENT,
  MAX_CRITICAL_DAMAGE_PERCENT,
  convertRatingToPercentage,
} from './player-defaults';

describe('convertRatingToPercentage', () => {
  it('keeps starter percentages modest', () => {
    expect(convertRatingToPercentage(StatType.CRIT, 5, 1)).toBe(4.3);
    expect(convertRatingToPercentage(StatType.DODGE, 5, 1)).toBe(4.3);
    expect(convertRatingToPercentage(StatType.CRIT_DAMAGE, 5, 1)).toBe(172.7);
  });
  it('scales chance ratings against the player level', () => {
    expect(convertRatingToPercentage(StatType.CRIT, 41, 100)).toBe(12.3);
    expect(convertRatingToPercentage(StatType.DODGE, 38, 100)).toBe(11.4);
  });

  it('caps critical chance and dodge at 50%', () => {
    expect(convertRatingToPercentage(StatType.CRIT, 200, 100)).toBe(MAX_CHANCE_PERCENT);
    expect(convertRatingToPercentage(StatType.DODGE, 200, 100)).toBe(MAX_CHANCE_PERCENT);
  });

  it('starts critical damage at 150% and applies gradual diminishing returns', () => {
    expect(convertRatingToPercentage(StatType.CRIT_DAMAGE, 0, 100)).toBe(BASE_CRITICAL_DAMAGE_PERCENT);
    expect(convertRatingToPercentage(StatType.CRIT_DAMAGE, 1, 10)).toBe(155.2);
    expect(convertRatingToPercentage(StatType.CRIT_DAMAGE, 70, 100)).toBe(245.5);
    expect(convertRatingToPercentage(StatType.CRIT_DAMAGE, 1_000_000, 100)).toBe(MAX_CRITICAL_DAMAGE_PERCENT);
  });

  it('does not convert flat defense points into a percentage', () => {
    expect(convertRatingToPercentage(StatType.DEFENSE, 100, 100)).toBe(100);
  });
});
