const BASE_API_PATH = `${import.meta.env.VITE_BACK_URL}/api/v1`;

const routes = {
  api: {
    signInPath: () => [BASE_API_PATH, 'sign_in'].join('/'),
    signUpPath: () => [BASE_API_PATH, 'sign_up'].join('/'),
  },
  rootPath: () => '/',
  loginPath: () => '/login',
};

export default routes;
