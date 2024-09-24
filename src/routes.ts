const BASE_API_PATH = '/api/v1';

export default {
  rootPagePath: () => '/',
  loginPagePath: () => '/login',
  api: {
    signInPath: () => ['/sign_in'].join('/'),
  },
};
