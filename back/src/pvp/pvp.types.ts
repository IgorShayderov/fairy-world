export type PvpDifficulty = 'EASY' | 'MEDIUM' | 'HARD';

export type PvpOpponent = {
  id: string;
  name: string;
  level: number;
  difficulty: PvpDifficulty;
  isBot: boolean;
  avatarIcon?: string;
  health: number;
  maxHealth: number;
  damage: number;
  defense: number;
  dodge: number;
  blockChance: number;
  criticalChance: number;
  criticalDamage: number;
  rewards: {
    gold: number;
    experience: number;
  };
};

export type PvpCombatant = {
  name: string;
  level: number;
  health: number;
  maxHealth: number;
  damage: number;
  defense: number;
  dodge: number;
  blockChance: number;
  criticalChance: number;
  criticalDamage: number;
};

export type PvpBattleEvent = {
  actor: 'PLAYER' | 'OPPONENT';
  damage: number;
  critical: boolean;
  dodged: boolean;
  blocked?: boolean;
};

export type PvpDuelResult = {
  id: string;
  status: 'VICTORY' | 'DEFEAT';
  turn: number;
  difficulty: PvpDifficulty;
  player: PvpCombatant;
  opponent: PvpCombatant;
  events: PvpBattleEvent[];
  cooldownUntil?: string | null;
  rewards: {
    gold: number;
    experience: number;
    coinsOfHonour?: number;
  } | null;
};
