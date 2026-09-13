import routes from '@/routes';
import { api } from '@shared/api';

export interface Quest {
  id: number;
  code: string;
  monsterType: string;
  target: number;
  rewardGold: number;
  isPrimary?: boolean;
  regionKey?: string | null;
  huntingLocation?: { key: string; x: number; y: number; nearby: string } | null;
}
export interface PlayerQuest {
  questId: number;
  townId: number;
  progress: number;
  acceptedAt: string;
  completedAt: string | null;
  quest: Quest;
}
export interface QuestJournal {
  town: { id: number; name: string } | null;
  available: Quest[];
  active: PlayerQuest[];
  completed: PlayerQuest[];
}
export const getQuests = async () => (await api.get<QuestJournal>(routes.api.quests.listPath())).data;
export const acceptQuest = async (id: number) => (await api.post<PlayerQuest>(routes.api.quests.acceptPath(id))).data;
export const cancelQuest = async (id: number) => { await api.post(routes.api.quests.cancelPath(id)); };
