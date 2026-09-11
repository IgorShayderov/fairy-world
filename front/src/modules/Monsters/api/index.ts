import routes from '@/routes';
import { api } from '@shared/api';

export type AttributeType = 'STRENGTH' | 'AGILITY' | 'ENDURANCE' | 'WISDOM' | 'CHARISMA';

export interface MonsterAttribute {
  monsterId: number;
  attributeId: number;
  value: number;
  attribute: { id: number; name: AttributeType; description: string | null };
}

export interface Monster {
  id: number;
  name: string;
  description: string | null;
  level: number;
  rewardGold: number;
  rewardExperience: number;
  icon: string | null;
  createdAt: string;
  updatedAt: string;
  attributes: MonsterAttribute[];
}

export type GeneratedMonster = Pick<
  Monster,
  'id' | 'name' | 'description' | 'level' | 'rewardGold' | 'rewardExperience'
> & {
  attributes: Array<Pick<MonsterAttribute, 'value'> & { attribute: Pick<MonsterAttribute['attribute'], 'name'> }>;
};

export interface BattleCombatant {
  name: string;
  health: number;
  maxHealth: number;
  damage: number;
  defense: number;
  dodge: number;
  criticalChance: number;
  criticalDamage: number;
}

export interface BattleState {
  id: string;
  status: 'ACTIVE' | 'VICTORY' | 'DEFEAT';
  turn: number;
  player: BattleCombatant;
  monster: BattleCombatant & {
    id: number;
    level: number;
    rewardGold: number;
    rewardExperience: number;
  };
  events: Array<{ actor: 'PLAYER' | 'MONSTER'; damage: number; critical: boolean; dodged: boolean }>;
  rewards?: { gold: number; experience: number };
}

export type EncounterRoll =
  | { encountered: false; chance: number }
  | { encountered: true; chance: number; monster: GeneratedMonster; battle: BattleState };

export const getMonsters = async (): Promise<Monster[]> => {
  const { data } = await api.get<Monster[]>(routes.api.monsters.listPath());
  return data;
};

export const getMonster = async (id: number): Promise<Monster> => {
  const { data } = await api.get<Monster>(routes.api.monsters.byIdPath(id));
  return data;
};

export const rollMonsterEncounter = async (): Promise<EncounterRoll> => {
  const { data } = await api.post<EncounterRoll>(routes.api.monsters.encounterPath());
  return data;
};

export const attackMonster = async (battleId: string): Promise<BattleState> => {
  const { data } = await api.post<BattleState>(routes.api.monsters.battleAttackPath(battleId));
  return data;
};

export const retreatFromBattle = async (battleId: string): Promise<void> => {
  await api.post(routes.api.monsters.battleRetreatPath(battleId));
};
