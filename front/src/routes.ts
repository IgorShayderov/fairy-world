import type { RouteRecordRaw } from 'vue-router';

const BASE_API_PATH = `${import.meta.env.VITE_BACK_URL}/api/v1`;
const BASE_AUTH_PATH = `${BASE_API_PATH}/auth`;

const routes = {
  api: {
    auth: {
      signInPath: () => [BASE_AUTH_PATH, 'login'].join('/'),
      signUpPath: () => [BASE_AUTH_PATH, 'register'].join('/'),
      refreshPath: () => [BASE_AUTH_PATH, 'refresh'].join('/'),
      logoutPath: () => [BASE_AUTH_PATH, 'logout'].join('/'),
      forgotPasswordPath: () => [BASE_AUTH_PATH, 'forgot-password'].join('/'),
      resetPasswordPath: () => [BASE_AUTH_PATH, 'reset-password'].join('/'),
    },
    chat: {
      channelsPath: () => [BASE_API_PATH, 'chat', 'channels'].join('/'),
      messagesPath: (channelId: string) => [BASE_API_PATH, 'chat', 'channels', channelId, 'messages'].join('/'),
      messagePath: () => [BASE_API_PATH, 'chat', 'messages'].join('/'),
    },
    shop: {
      itemsPath: () => [BASE_API_PATH, 'shop', 'items'].join('/'),
      buyPath: () => [BASE_API_PATH, 'shop', 'buy'].join('/'),
      sellPath: () => [BASE_API_PATH, 'shop', 'sell'].join('/'),
      inventoryPath: () => [BASE_API_PATH, 'shop', 'inventory'].join('/'),
    },
  },
  rootPath: () => '/',
  loginPath: () => '/login',
  profilePath: () => '/profile',
  shopPath: () => '/shop',
  registerPath: () => '/register',
  forgotPasswordPath: () => '/forgot-password',
  resetPasswordPath: (token: string) => `/reset-password/${token}`,
};

export default routes;

export const appRoutes: RouteRecordRaw[] = [
  { path: routes.loginPath(), name: 'LoginPage', component: () => import('@/pages/LoginPage.vue') },
  { path: routes.rootPath(), name: 'RootPage', component: () => import('@/pages/RootPage.vue') },
  { path: '/:path(.*)', redirect: routes.rootPath() },
];
