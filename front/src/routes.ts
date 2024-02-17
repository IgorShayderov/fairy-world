const BASE_API_PATH = '/api/v1';

export default {
  rootPagePath: () => '/',
  loginPagePath: () => '/login',
  api: {
    signIn: ['/sign_in'].join('/'),
  },
};
