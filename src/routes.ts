const BASE_API_PATH = `${import.meta.env.VITE_BACK_URL}/api/v1`;

export default {
  rootPagePath: () => '/',
  loginPagePath: () => '/login',
  api: {
    signInPath: () => [BASE_API_PATH, '/sign_in'].join('/'),
  },
};
