const modules = {
  auth: {
    validation: {
      errors: {
        email: {
          required: 'Email обязателен',
          incorrect: 'Введите корректный email',
        },
        password: {
          required: 'Пароль обязателен',
        },
      },
    },
    fields: {
      password: {
        label: 'Пароль',
      },
    },
    buttons: {
      login: 'Войти',
      forgotPassword: 'Забыли пароль?',
    },
    labels: {
      login: 'Вход в систему',
    },
  },
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
  dashboard: {
    contentBlock: 'Контент блок {{n}}',
    sidebarTitle: 'Панель',
    item: 'Элемент {{n}}',
  },
};

export default modules;
