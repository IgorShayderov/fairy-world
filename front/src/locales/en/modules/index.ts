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
  },
};

export default modules;
