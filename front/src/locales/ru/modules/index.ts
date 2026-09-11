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
  fantasy: {
    realm: 'Зачарованное королевство',
    mapTitle: 'Элдория',
    mapDescription: 'Атлас древних дорог, тайных святилищ и забытой магии',
    legend: 'Обозначения',
    city: 'Город',
    village: 'Деревня',
    dungeon: 'Подземелье',
    sanctum: 'Святилище',
    zoomIn: 'Приблизить',
    zoomOut: 'Отдалить',
    resetView: 'Сбросить масштаб карты',
    controlsHint: 'Перетаскивайте карту · Нажмите, чтобы идти · Колесо — масштаб',
  },
};

export default modules;
