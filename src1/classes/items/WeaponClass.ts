import Item from './ItemClass';
class Weapon extends Item {
  weaponType: string;

  constructor(name = '', itemType = 'common', cost = 0, weaponType: string) {
    super(name, itemType, cost);
    this.weaponType = weaponType;
  }
}

export default Weapon;
