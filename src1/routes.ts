const BASE_API_PATH = `${import.meta.env.VITE_BACK_URL}/api/v1`;

export default {
  rootPagePath: () => '/',
  loginPagePath: () => '/login',
  api: {
    signInPath: () => [BASE_API_PATH, 'sign_in'].join('/'),
    signUpPath: () => [BASE_API_PATH, 'sign_up'].join('/'),
    signOutPath: () => [BASE_API_PATH, 'sign_out'].join('/'),
    currentUserPath: () => [BASE_API_PATH, 'current_user'].join('/'),
  },
};
