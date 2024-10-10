export default {
  translation: {
    pages: {
      loginPage: {
        messages: {
          auth: {
            success: 'Вы успешно вошли!',
            failure: 'Неверный email или пароль',
          },
        },
        title: 'Страница аутентификации',
        form: {
          email: {
            label: 'Email',
            placeholder: 'Введите ваш email',
            errors: {},
          },
          password: {
            label: 'Пароль',
            placeholder: 'Введите ваш пароль',
            errors: {},
          },
          submitBtn: {
            label: 'Войти',
          },
        },
      },
      root: {
        buttons: {
          logout: 'Logout',
        },
      },
    },
  },
};
