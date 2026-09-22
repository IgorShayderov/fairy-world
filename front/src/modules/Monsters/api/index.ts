import type { InventoryEntry } from '@/modules/Inventory/types';

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
  events: Array<{
    actor: 'PLAYER' | 'MONSTER';
    damage: number;
    critical: boolean;
    dodged: boolean;
    actorName?: string;
    targetName?: string;
  }>;
  rewards?: {
    gold: number;
    experience: number;
    items: Array<
      InventoryEntry['item'] & {
        level: number;
        quantity: 1;
        inventoryItemId?: number;
        addedToInventory?: boolean;
        inventoryFull?: boolean;
      }
    >;
    craftItems: Array<{
      id: number;
      name: string;
      description: string;
      icon: string;
      rarity: 'QUEST' | 'COMMON' | 'MAGIC' | 'RARE' | 'UNIQUE';
      quantity: number;
    }>;
  };
  canRetreat: boolean;
}

export type DungeonOpponentStatus = 'AVAILABLE' | 'LOCKED' | 'DEFEATED';

export interface DungeonOpponent {
  id: string;
  monsterType: string;
  image: string;
  isBoss: boolean;
  status: DungeonOpponentStatus;
  monster: BattleCombatant & {
    level: number;
    rewardGold: number;
    rewardExperience: number;
  };
}

export interface DungeonRunState {
  id: string;
  dungeon: string;
  status: 'ACTIVE' | 'VICTORY' | 'DEFEAT';
  startedAt: string;
  player: BattleCombatant;
  opponents: DungeonOpponent[];
  latestEvents: BattleState['events'];
  lastBattleResult: null | { winner: 'PLAYER' | 'MONSTER'; winnerName: string };
  lastExperience: number;
  totalExperience: number;
  rewards: null | {
    gold: number;
    experience: number;
    items: Array<
      InventoryEntry['item'] & {
        quantity: 1;
        inventoryItemId?: number;
        addedToInventory: boolean;
        inventoryFull: boolean;
      }
    >;
    craftItems: Array<{
      id: number;
      name: string;
      description: string;
      icon: string;
      rarity: 'QUEST' | 'COMMON' | 'MAGIC' | 'RARE' | 'UNIQUE';
      quantity: number;
    }>;
  };
  party?: { id: string; members: DungeonPartyMember[] };
  partyLoot?: {
    status: 'CHOOSING' | 'RESOLVED';
    submittedProfileIds: number[];
    deadlineAt?: string;
    items: Array<
      InventoryEntry['item'] & {
        quantity: 1;
        claimantProfileIds: number[];
        winnerProfileId?: number;
        winnerName?: string;
        inventoryItemId?: number;
        addedToInventory: boolean;
        inventoryFull: boolean;
      }
    >;
  };
}

export interface DungeonPartyMember {
  profileId: number;
  userId: number;
  name: string;
  level: number;
  leader: boolean;
  health?: number;
  maxHealth?: number;
  mana?: number;
  maxMana?: number;
}

export interface DungeonParty {
  id: string;
  dungeon: string;
  status: string;
  members: DungeonPartyMember[];
  isLeader: boolean;
}

export interface DungeonPartyLobby {
  currentParty: DungeonParty | null;
  openParties: DungeonParty[];
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

export const attackMonster = async (battleId: string): Promise<BattleState> => {
  const { data } = await api.post<BattleState>(routes.api.monsters.battleAttackPath(battleId));
  return data;
};

export const retreatFromBattle = async (battleId: string): Promise<void> => {
  await api.post(routes.api.monsters.battleRetreatPath(battleId));
};

export const getActiveDungeon = async (): Promise<DungeonRunState | null> => {
  const { data } = await api.get<DungeonRunState | null>(routes.api.monsters.activeDungeonPath());
  return data;
};

export const getDungeonParties = async (name: string): Promise<DungeonPartyLobby> => {
  const { data } = await api.get<DungeonPartyLobby>(routes.api.monsters.dungeonPartiesPath(name));
  return data;
};

export const createDungeonParty = async (name: string): Promise<DungeonParty> => {
  const { data } = await api.post<DungeonParty>(routes.api.monsters.dungeonPartiesPath(name));
  return data;
};

export const joinDungeonParty = async (partyId: string): Promise<DungeonParty> => {
  const { data } = await api.post<DungeonParty>(routes.api.monsters.dungeonPartyJoinPath(partyId));
  return data;
};

export const leaveDungeonParty = async (partyId: string): Promise<void> => {
  await api.post(routes.api.monsters.dungeonPartyLeavePath(partyId));
};

export const startDungeonParty = async (partyId: string): Promise<DungeonRunState> => {
  const { data } = await api.post<DungeonRunState>(routes.api.monsters.dungeonPartyStartPath(partyId));
  return data;
};

export const attackDungeonOpponent = async (runId: string, opponentId: string): Promise<DungeonRunState> => {
  const { data } = await api.post<DungeonRunState>(routes.api.monsters.dungeonOpponentAttackPath(runId, opponentId));
  return data;
};

export const leaveDungeon = async (runId: string): Promise<void> => {
  await api.post(routes.api.monsters.dungeonLeavePath(runId));
};

export const useDungeonHealthPotion = async (
  runId: string,
  inventoryItemId: number
): Promise<{ run: DungeonRunState; healed: number }> => {
  const { data } = await api.post<{ run: DungeonRunState; healed: number }>(
    routes.api.monsters.dungeonHealthPotionPath(runId, inventoryItemId)
  );
  return data;
};

export const submitDungeonPartyLoot = async (runId: string, itemIds: number[]): Promise<DungeonRunState> => {
  const { data } = await api.post<DungeonRunState>(routes.api.monsters.dungeonPartyLootPath(runId), { itemIds });
  return data;
};
