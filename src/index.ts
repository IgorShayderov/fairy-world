import './scss/main.scss';
import Player from '@src/classes/player/PlayerClass';
import Weapon from '@src/classes/items/WeaponClass';

import Log from '@src/helpers/LogClass';

'use strict';

const chaosSword = new Weapon('Chaos Sword', 'sword');
const player = new Player('Hero');

player.inventory.equipItem(chaosSword);
