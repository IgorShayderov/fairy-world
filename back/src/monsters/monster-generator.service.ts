import { Injectable } from '@nestjs/common';
import { AttributeType } from '../../generated/client';
import { MONSTER_ARCHETYPES, MONSTER_RANKS, MonsterRank } from './monster-generator.config';
import { habitatAt } from './monster-habitats';

export interface GeneratedMonster {
  monsterType: string;
  id: number;
  name: string;
  description: string;
  level: number;
  rewardGold: number;
  rewardExperience: number;
  attributes: Array<{ value: number; attribute: { name: AttributeType } }>;
}

@Injectable()
export class MonsterGeneratorService {
  generate(playerLevel: number, position?: { x: number; y: number }): GeneratedMonster {
    const level = Math.max(1, playerLevel + this.randomInt(0, 2));
    const habitat = position ? habitatAt(position) : null;
    const candidates = habitat
      ? MONSTER_ARCHETYPES.filter((archetype) => (habitat.monsters as readonly string[]).includes(archetype.name))
      : MONSTER_ARCHETYPES;
    const archetype = this.randomElement(candidates);
    const rank = this.generateRank();
    const attributeBase = Math.max(1, Math.round((2 + level * 0.65) * rank.powerMultiplier));

    return {
      monsterType: archetype.name,
      id: this.randomInt(1_000_000, 2_000_000_000),
      name: `${rank.name} ${archetype.name}`,
      description: `${archetype.description} This ${rank.name.toLowerCase()} creature is level ${level}.`,
      level,
      rewardGold: Math.max(1, Math.round((5 + level * 4) * rank.rewardMultiplier)),
      rewardExperience: Math.max(1, Math.round((10 + level * 6) * rank.rewardMultiplier)),
      attributes: [
        { value: attributeBase + this.randomInt(1, 3), attribute: { name: archetype.primaryAttribute } },
        { value: attributeBase, attribute: { name: archetype.secondaryAttribute } },
      ],
    };
  }

  private generateRank(): MonsterRank {
    const totalWeight = MONSTER_RANKS.reduce((sum, rank) => sum + rank.weight, 0);
    let roll = Math.random() * totalWeight;

    for (const rank of MONSTER_RANKS) {
      roll -= rank.weight;
      if (roll <= 0) return rank;
    }

    return MONSTER_RANKS[0];
  }

  private randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private randomElement<T>(items: T[]): T {
    return items[Math.floor(Math.random() * items.length)];
  }
}
