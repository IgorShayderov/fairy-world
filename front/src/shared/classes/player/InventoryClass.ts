import type Item from '../items/ItemClass';

import Backpack from './BackpackClass';

export interface EquipedItems {
  necklace: null | Item;
  helmet: null | Item;
  ring: null | Item;
  weapon: null | Item;
  armor: null | Item;
  shield: null | Item;
  gloves: null | Item;
  pants: null | Item;
  shoes: null | Item;
}

/**
 * Player inventory
 */
class Inventory {
  equipedItems: EquipedItems;
  backpackedItems: Backpack;
  quickSlots: Set<Item>;

  constructor() {
    this.equipedItems = {
      necklace: null,
      helmet: null,
      ring: null,
      weapon: null,
      armor: null,
      shield: null,
      gloves: null,
      pants: null,
      shoes: null,
    };
    Object.seal(this.equipedItems);
    this.backpackedItems = new Backpack();
    this.quickSlots = new Set();
  }
}

export default Inventory;
