import routes from '@/routes';
import { api } from '@shared/api';

export type PlayerClass = 'WARRIOR' | 'SCOUT' | 'MAGE';
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
  effect?: SkillEffect;
  canCrit?: boolean;
  manaCost?: number;
  cooldown?: number;
  range?: number;
}
export interface SkillTree {
  class: PlayerClass | null;
  ranks: Record<string, number>;
  points: { total: number; spent: number; available: number };
  level: number;
  gems: number;
  resetCost: number;
  classes: PlayerClass[];
  catalog: SkillDefinition[];
  locked: boolean;
}
export interface BattleSkills {
  mana: number;
  maxMana: number;
  abilities: (SkillDefinition & { rank: number; remainingCooldown: number; unavailable: string | null })[];
}
export const skillsApi = {
  async reset() {
    return (await api.post<SkillTree>(routes.api.skills.resetPath())).data;
  },
  async get() {
    return (await api.get<SkillTree>(routes.api.skills.path())).data;
  },
  async choose(playerClass: PlayerClass) {
    return (await api.post<SkillTree>(routes.api.skills.classPath(), { class: playerClass })).data;
  },
  async upgrade(id: string) {
    return (await api.post<SkillTree>(routes.api.skills.upgradePath(id))).data;
  },
};
