export default {
  auth: {
    validation: {
      errors: {
        email: {
          required: 'Email is required',
          incorrect: 'Enter a valid email',
        },
        password: {
          required: 'Password is required',
        },
      },
    },
    notifications: {
      resetLinkSent: 'If the account exists, instructions will be sent to the email address.',
      resetError: 'An error occurred while requesting a password reset.',
    },
    fields: {
      password: {
        label: 'Password',
      },
      email: {
        label: 'Email',
      },
    },
    buttons: {
      login: 'Login',
      forgotPassword: 'Forgot password?',
      logout: 'Log out',
      sendResetLink: 'Send Reset Link',
      backToLogin: 'Back to Login',
    },
    labels: {
      login: 'Login to system',
      forgotPassword: 'Reset Password',
    },
  },
};
