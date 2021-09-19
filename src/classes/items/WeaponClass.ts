import Item from './ItemClass';

/**
 * Weapon item
 * @param {string} name - Weapon name
 * @param {string} weaponType - Weapon type
 */
function Weapon(name: string, weaponType: string): void {
  Item.call(this, name, 'weapon');

  this.weaponType = weaponType;
}

Weapon.prototype = new Item();
Object.defineProperty(Weapon.prototype, 'contructor', {
  enumerable: false,
  value: Weapon,
  writable: true,
});

export default Weapon;
