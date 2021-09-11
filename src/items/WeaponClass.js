import Item from './ItemClass';

function Weapon() {

}

Weapon.prototype = new Item();
Object.defineProperty(Weapon.prototype, 'contructor', {
  enumerable: false,
  value: Weapon,
  writable: true
});

export default Weapon;
