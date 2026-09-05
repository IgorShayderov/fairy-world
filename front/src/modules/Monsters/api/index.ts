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

export const getMonsters = async (): Promise<Monster[]> => {
  const { data } = await api.get<Monster[]>(routes.api.monsters.listPath());
  return data;
};

export const getMonster = async (id: number): Promise<Monster> => {
  const { data } = await api.get<Monster>(routes.api.monsters.byIdPath(id));
  return data;
};
