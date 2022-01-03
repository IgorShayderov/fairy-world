import Item from '../items/ItemClass';
import Backpack from './BackpackClass';

type EquipedItems = {
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

  equipItem(this: Inventory, item: Item): void {
    const { itemType } = item;

    this.equipedItems[itemType] = item;
    console.info(`%c${item} item is successfully equiped.`, 'color: red;');
  };
}


Inventory.prototype.unequipItem = function(this: Inventory, itemType: 'string'): void {
  if (Object.prototype.hasOwnProperty.call(this.equipedItems, itemType)) {
    this.equipedItems[itemType] = null;
  } else {
    throw new Error('Wrong item type');
  }
};

export default Inventory;
