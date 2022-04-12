// TODO Factory

/**
 * Abstract class for items
 * @param {string} name - Item name
 * @param {string} itemType - Item type
 * @param {number} cost - Item cost
 */
class Item {
  name: string;
  itemType: string;
  cost: number

  constructor(name = '', itemType = 'common', cost = 0) {
    this.name = name;
    this.itemType = itemType;
    this.cost = cost;
  }
}

export default Item;
