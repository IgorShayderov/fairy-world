import { StatType } from '../../generated/client';
import {
  BASE_CRITICAL_DAMAGE_PERCENT,
  MAX_CHANCE_PERCENT,
  MAX_CRITICAL_DAMAGE_PERCENT,
  convertRatingToPercentage,
} from './player-defaults';

describe('convertRatingToPercentage', () => {
  it('keeps starter percentages modest', () => {
    expect(convertRatingToPercentage(StatType.CRIT, 2.5, 1)).toBe(3.3);
    expect(convertRatingToPercentage(StatType.DODGE, 2.5, 1)).toBe(3.3);
    expect(convertRatingToPercentage(StatType.DEFENSE, 5, 1)).toBe(4.8);
    expect(convertRatingToPercentage(StatType.CRIT_DAMAGE, 5, 1)).toBe(166.7);
  });
  it('scales chance ratings against the player level', () => {
    expect(convertRatingToPercentage(StatType.CRIT, 41, 100)).toBe(26.7);
    expect(convertRatingToPercentage(StatType.DODGE, 38, 100)).toBe(24.7);
  });

  it('caps critical chance and dodge at 50%', () => {
    expect(convertRatingToPercentage(StatType.CRIT, 200, 100)).toBe(MAX_CHANCE_PERCENT);
    expect(convertRatingToPercentage(StatType.DODGE, 200, 100)).toBe(MAX_CHANCE_PERCENT);
  });

  it('starts critical damage at 150% and applies gradual diminishing returns', () => {
    expect(convertRatingToPercentage(StatType.CRIT_DAMAGE, 0, 100)).toBe(BASE_CRITICAL_DAMAGE_PERCENT);
    expect(convertRatingToPercentage(StatType.CRIT_DAMAGE, 1, 10)).toBe(153.7);
    expect(convertRatingToPercentage(StatType.CRIT_DAMAGE, 70, 100)).toBe(245.5);
    expect(convertRatingToPercentage(StatType.CRIT_DAMAGE, 1_000_000, 100)).toBe(MAX_CRITICAL_DAMAGE_PERCENT);
  });

  it('converts defense rating into level-scaled damage reduction', () => {
    expect(convertRatingToPercentage(StatType.DEFENSE, 100, 100)).toBe(9.1);
    expect(convertRatingToPercentage(StatType.DEFENSE, 100, 10)).toBe(50);
  });
});
