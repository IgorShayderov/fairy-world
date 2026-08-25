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
        },
      },
    },
    fields: {
      password: {
        label: 'Password',
      },
    },
    buttons: {
      login: 'Login',
      forgotPassword: 'Forgot password?',
    },
    labels: {
      login: 'Login to system',
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
