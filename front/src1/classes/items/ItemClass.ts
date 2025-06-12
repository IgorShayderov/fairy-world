// TODO Factory

export type ItemType = 'common' | 'weapon' | 'armor';

/**
 * Abstract class for items
 * @param {string} name - Item name
 * @param {ItemType} itemType - Item type
 * @param {number} cost - Item cost
 */
class Item {
  name: string;
  itemType: ItemType;
  cost: number;

  constructor(name = '', itemType = 'common' as ItemType, cost = 0) {
    this.name = name;
    this.itemType = itemType;
    this.cost = cost;
  }
}

export default Item;
