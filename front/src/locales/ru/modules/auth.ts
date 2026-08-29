export default {
  auth: {
    labels: {
      forgotPassword: 'Восстановление пароля',
      login: 'Вход в систему',
      resetPassword: 'Сброс пароля',
    },
    fields: {
      email: {
        label: 'Email',
      },
      password: {
        label: 'Пароль',
      },
      passwordConfirm: {
        label: 'Подтвердите пароль',
      },
    },
    buttons: {
      login: 'Войти',
      forgotPassword: 'Забыли пароль?',
      sendResetLink: 'Отправить ссылку',
      backToLogin: 'Вернуться ко входу',
      logout: 'Выйти',
      saveNewPassword: 'Сохранить новый пароль',
    },
    notifications: {
      resetLinkSent: 'Если аккаунт существует, инструкции будут отправлены на email.',
      resetRequestError: 'Произошла ошибка при запросе восстановления пароля',
      tokenMissing: 'Токен восстановления не найден в URL.',
      passwordsMismatch: 'Пароли не совпадают.',
      resetSuccess: 'Пароль успешно обновлён!',
      resetError: 'Ошибка при сбросе пароля. Попробуйте снова.',
    },
    validation: {
      errors: {
        email: {
          required: 'Email обязателен',
          incorrect: 'Введите корректный email',
        },
        password: {
          required: 'Пароль обязателен',
          minLength: 'Пароль должен содержать не менее 6 символов',
          mustContainLetter: 'Пароль должен содержать хотя бы одну букву',
          mustContainDigit: 'Пароль должен содержать хотя бы одну цифру',
          mismatch: 'Пароли не совпадают',
        },
      },
    },
  },
};
