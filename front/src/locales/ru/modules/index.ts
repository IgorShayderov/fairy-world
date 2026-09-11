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
    encounter: {
      eyebrow: 'Путешествие прервано',
      title: 'На пути появился враг',
      subtitle: 'Путешествие остановлено: противник выходит на поле боя.',
      level: 'Уровень {{level}}',
      enemyIntel: 'Сведения о противнике',
      unknownEnemy: 'Об этом существе пока ничего не известно.',
      possibleRewards: 'Возможная награда',
      battlefieldSuggestion:
        'Следующий этап: тактическое поле в стиле Heroes, где на каждом ходу важны движение, дальность и рельеф.',
      returnToMap: 'Вернуться на карту',
      traveler: 'Путешественник',
      turn: 'Ход {{turn}}',
      combatLog: 'Журнал боя',
      chooseAction: 'Выберите действие. После вашей атаки противник ответит.',
      attack: 'Атаковать',
      attacking: 'Атака…',
      retreat: 'Отступить',
      victory: 'Победа',
      defeat: 'Поражение',
      you: 'Вы',
      enemy: 'Противник',
      dodged: '{{actor}} уклонился от атаки.',
      hit: '{{actor}} наносит {{damage}} урона.',
      criticalHit: '{{actor}} наносит критический удар на {{damage}} урона!',
    },
  },
};

export default modules;
