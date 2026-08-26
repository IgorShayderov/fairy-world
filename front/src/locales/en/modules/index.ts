import profile from './profile';
import shop from './shop';

const modules = {
  ...profile,
  ...shop,
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
  menu: {
    title: 'Menu',
    home: 'Main page',
    profile: 'Profile',
    shop: 'Shop',
  },
};

export default modules;
