import auth from './auth';
import profile from './profile';
import shop from './shop';

const modules = {
  auth,
  profile,
  shop,
  chat: {
    titles: {
      channels: 'Channels',
    },
    statuses: {
      loadingChannels: 'Loading...',
      loadingMessages: 'Loading messages...',
      selectChannel: 'Select a channel',
    },
    inputs: {
      messagePlaceholder: 'Type a message...',
    },
    buttons: {
      send: 'Send',
    },
  },
  menu: {
    title: 'Menu',
    home: 'Main page',
    profile: 'Profile',
    shop: 'Shop',
  },
  fantasy: {
    realm: 'The enchanted realm of',
    mapTitle: 'Eldoria',
    mapDescription: 'An atlas of old roads, hidden sanctums and forgotten magic',
    legend: 'Map legend',
    city: 'City',
    village: 'Village',
    dungeon: 'Dungeon',
    sanctum: 'Sanctum',
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    resetView: 'Reset map view',
    controlsHint: 'Drag to explore · Click to travel · Scroll to zoom',
    encounter: {
      eyebrow: 'Travel interrupted',
      title: 'A hostile presence emerges',
      subtitle: 'Your journey stops as an enemy takes the field.',
      level: 'Level {{level}}',
      enemyIntel: 'Enemy intelligence',
      unknownEnemy: 'Nothing is known about this creature yet.',
      possibleRewards: 'Possible rewards',
      battlefieldSuggestion:
        'Recommended next step: a Heroes-style tactical grid where movement, range and terrain matter each turn.',
      returnToMap: 'Return to map',
      traveler: 'Traveler',
      turn: 'Turn {{turn}}',
      combatLog: 'Combat log',
      chooseAction: 'Choose your action. The enemy will answer after your attack.',
      attack: 'Attack',
      attacking: 'Attacking…',
      retreat: 'Retreat',
      victory: 'Victory',
      defeat: 'Defeat',
      you: 'You',
      enemy: 'Enemy',
      dodged: '{{actor}} dodged the attack.',
      hit: '{{actor}} dealt {{damage}} damage.',
      criticalHit: '{{actor}} landed a critical hit for {{damage}} damage!',
    },
  },
};

export default modules;
