import Inventory from './InventoryClass';

/**
 * Player information
 * @param {string} name - Player name
 */
function PlayerInfo(name: string): void {
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
  this.freeAtttributes = 3;
  // extra
  this.location = null;
}

export default PlayerInfo;
