import profile from './profile';
import shop from './shop';
import auth from './auth';

const modules = {
  ...auth,
  ...profile,
  ...shop,
  chat: {
    titles: {
      channels: 'Каналы',
    },
    statuses: {
      loadingChannels: 'Загрузка...',
      loadingMessages: 'Загрузка сообщений...',
      selectChannel: 'Выберите канал',
    },
    inputs: {
      messagePlaceholder: 'Написать сообщение...',
    },
    buttons: {
      send: 'Отправить',
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
