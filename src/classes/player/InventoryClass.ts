import Backpack from './BackpackClass';

/**
 * Player inventory
 */
function Inventory(): void {
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

Inventory.prototype.equipItem = function(item): void {
  const { itemType } = item;

  this.equipedItems[itemType] = item;
  console.info(`%c${item} item is successfully equiped.`, 'color: red;');
};

Inventory.prototype.unequipItem = function(itemType: 'string'): void {
  if (Object.prototype.hasOwnProperty.call(this.equipedItems)) {
    this.equipedItems[itemType] = null;
  } else {
    throw new Error('Wrong item type');
  }
};

export default Inventory;
