const BASE_API_PATH = `${import.meta.env.VITE_BACK_URL}/api/v1`;

const routes = {
  rootPath: () => '/',
  loginPath: () => '/login',
  api: {
    signInPath: () => [BASE_API_PATH, 'sign_in'].join('/'),
  },
};

export default routes;
