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
          minLength: 'Пароль должен быть не менее 6 символов',
          mustContainLetter: 'Пароль должен содержать хотя бы одну букву',
          mustContainDigit: 'Пароль должен содержать хотя бы одну цифру',
        },
        name: {
          required: 'Имя обязательно',
          minLength: 'Имя должно быть не менее 2 символов',
          maxLength: 'Имя должно быть не более 50 символов',
        },
      },
    },
    fields: {
      password: {
        label: 'Пароль',
      },
      passwordConfirm: {
        label: 'Подтвердите пароль',
      },
      gender: {
        label: 'Пол',
      },
      country: {
        label: 'Страна',
      },
      city: {
        label: 'Город',
      },
      language: {
        label: 'Язык',
      },
      name: {
        label: 'Имя',
      },
    },
    buttons: {
      login: 'Войти',
      forgotPassword: 'Забыли пароль?',
      register: 'Зарегистрироваться',
      alreadyHaveAccount: 'Уже есть аккаунт?',
      sendResetLink: 'Отправить ссылку для сброса',
      backToLogin: 'Назад к входу',
      saveNewPassword: 'Сохранить новый пароль',
    },
    labels: {
      login: 'Вход в систему',
      register: 'Создать новый аккаунт',
      forgotPassword: 'Забыли пароль?',
      resetPassword: 'Сбросить пароль',
      optional: 'Опциональные поля',
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
