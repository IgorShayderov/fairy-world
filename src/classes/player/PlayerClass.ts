import Inventory from './InventoryClass';

type Player = {
  inventory: Inventory;
  name: string;
  level: number;
  experience: number;
  experienceToLvlUp: number;
  gold: number;
  enemiesKilled: number;
  hitpoints: number;
  damage: number;
  defence: number;
  critticalDamage: number;
  critticalChance: number;
  strength: number;
  endurance: number;
  vitality: number;
  freeAttributes: number;
  location: null;
}

/**
 * Player information
 * @param {Player} this - Player costructor
 * @param {string} name - Player name
 */
function Player(this: Player, name: string): void {
  this.inventory = new Inventory();
  // basicInfo
  this.name = name;
  this.level = 0;
  this.experience = 0;
  this.experienceToLvlUp = 1000;
  this.gold = 0;
  this.enemiesKilled = 0;
  // stats
  this.hitpoints = 100;
  this.damage = 5;
  this.defence = 0;
  this.critticalDamage = 0;
  this.critticalChance = 0;
  // attributes
  this.strength = 5;
  this.endurance = 5;
  this.vitality = 5;
  this.freeAttributes = 3;
  // extra
  this.location = null;
}

export default Player;
