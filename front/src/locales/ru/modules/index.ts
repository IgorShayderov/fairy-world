import auth from './auth';
import profile from './profile';
import shop from './shop';

const modules = {
  ...auth,
  ...profile,
  ...shop,
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
    title: 'Меню',
    home: 'Главная',
    profile: 'Профиль',
    shop: 'Магазин',
  },
};

export default modules;