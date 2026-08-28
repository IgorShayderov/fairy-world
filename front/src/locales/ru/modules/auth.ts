export default {
  auth: {
    labels: {
      forgotPassword: 'Восстановление пароля',
      login: 'Вход в систему',
    },
    fields: {
      email: {
        label: 'Email',
      },
      password: {
        label: 'Пароль',
      },
    },
    buttons: {
      login: 'Войти',
      forgotPassword: 'Забыли пароль?',
      sendResetLink: 'Отправить ссылку',
      backToLogin: 'Вернуться ко входу',
      logout: 'Выйти',
    },
    notifications: {
      resetLinkSent: 'Если аккаунт существует, инструкции будут отправлены на email.',
      resetError: 'Произошла ошибка при запросе восстановления пароля',
    },
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
  },
};
