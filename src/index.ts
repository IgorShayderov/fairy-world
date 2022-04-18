import './scss/main.scss';
import './scss/indentation.scss';
import './scss/buttons.scss';
import './scss/icons.scss';

import { createApp } from 'vue';
import App from '@components/App.vue';
// import Player from '@src/classes/player/PlayerClass';
// import Weapon from '@src/classes/items/WeaponClass';

// import Log from '@src/helpers/LogClass';

'use strict';

createApp(App).mount('#app');

// const chaosSword = new Weapon('Chaos Sword', 'sword');
// const player = new Player('Hero');

// player.inventory.equipItem(chaosSword);
