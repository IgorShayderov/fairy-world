import Inventory from './InventoryClass';

type PlayerInfo = {
  name: string;
  level: number;
  experience: number;
  experienceToLvlUp : number;
  gold: number;
  enemiesKilled: number;
}

type PlayerStats = {
  hitpoints: number;
  damage: number;
  defence: number;
  critticalDamage: number;
  critticalChance: number;
}

type PlayerAttributes = {
  strength: number;
  endurance: number;
  vitality: number;
  freeAttributes: number;
}

type PlayerExtraData = {
  location: null;
}


/**
 * Player information
 * @param {Player} this - Player costructor
 * @param {string} name - Player name
 */
class Player {
  inventory: Inventory;
  playerInfo: PlayerInfo;
  playerStats: PlayerStats;
  playerAttributes: PlayerAttributes;
  playerExtraData: PlayerExtraData;

  constructor(name: string) {
    this.inventory = new Inventory();

    this.playerInfo = {
      name,
      level: 0,
      experience: 0,
      experienceToLvlUp: 1000,
      gold: 0,
      enemiesKilled: 0,
    };

    this.playerStats = {
      hitpoints: 100,
      damage: 5,
      defence: 0,
      critticalDamage: 0,
      critticalChance: 0,
    };

    this.playerAttributes = {
      strength: 5,
      endurance: 5,
      vitality: 5,
      freeAttributes: 3,
    };

    this.playerExtraData = {
      location: null,
    };
  }
}

export default Player;
