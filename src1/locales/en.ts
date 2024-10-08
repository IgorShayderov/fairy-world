export default {
  translation: {
    pages: {
      loginPage: {
        messages: {
          auth: {
            success: 'You have successfully authenticated!',
            failure: 'Incorrect email or password',
          },
        },
        title: 'Login page',
        form: {
          email: {
            label: 'Email',
            placeholder: 'Type your email',
            errors: {},
          },
          password: {
            label: 'Password',
            placeholder: 'Type your password',
            errors: {},
          },
          submitBtn: {
            label: 'Sign in',
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
