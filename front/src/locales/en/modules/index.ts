const modules = {
  auth: {
    validation: {
      errors: {
        email: {
          required: 'Email is required',
          incorrect: 'Enter a valid email',
        },
        password: {
          required: 'Password is required',
          minLength: 'Password must be at least 6 characters',
          mustContainLetter: 'Password must contain at least one letter',
          mustContainDigit: 'Password must contain at least one digit',
        },
        name: {
          required: 'Name is required',
          minLength: 'Name must be at least 2 characters',
          maxLength: 'Name must be no more than 50 characters',
        },
      },
    },
    fields: {
      password: {
        label: 'Password',
      },
      passwordConfirm: {
        label: 'Confirm Password',
      },
      gender: {
        label: 'Gender',
      },
      country: {
        label: 'Country',
      },
      city: {
        label: 'City',
      },
      language: {
        label: 'Language',
      },
      name: {
        label: 'Name',
      },
    },
    buttons: {
      login: 'Login',
      forgotPassword: 'Forgot password?',
      register: 'Register',
      alreadyHaveAccount: 'Already have an account?',
      sendResetLink: 'Send Reset Link',
      backToLogin: 'Back to login',
      saveNewPassword: 'Save New Password',
    },
    labels: {
      login: 'Login to system',
      register: 'Create new account',
      forgotPassword: 'Forgot your password?',
      resetPassword: 'Reset your password',
      optional: 'Optional fields',
    },
  },
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
  dashboard: {
    contentBlock: 'Content block {{n}}',
    sidebarTitle: 'Panel',
    item: 'Item {{n}}',
  },
};

export default modules;
