/* eslint-disable require-jsdoc */
import Item from '@src/classes/items/ItemClass';

/**
 * Player backpack
 * @param {Backpack} this - Backpack constructor
 */
class Backpack {
  maxItemsAmount: number;
  backpackedItems: Set<Item>;

  constructor() {
    this.maxItemsAmount = 10;
    this.backpackedItems = new Set();
  }
}

export default Backpack;
