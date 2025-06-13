import Item from './ItemClass';
import type { ItemType } from './ItemClass';

type WeaponType = 'blunt';

class Weapon extends Item {
  weaponType: string;

  constructor(name = '', itemType = 'common' as ItemType, cost = 0, weaponType: WeaponType) {
    super(name, itemType, cost);
    this.weaponType = weaponType;
  }
}

export default Weapon;
