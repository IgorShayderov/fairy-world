import type { RouteRecordRaw } from 'vue-router';

const BASE_API_PATH = `${import.meta.env.VITE_BACK_URL}/api/v1`;

const routes = {
  api: {
    signInPath: () => [BASE_API_PATH, 'auth', 'login'].join('/'),
    signUpPath: () => [BASE_API_PATH, 'auth', 'register'].join('/'),
    forgotPasswordPath: () => [BASE_API_PATH, 'auth', 'forgot-password'].join('/'),
    resetPasswordPath: () => [BASE_API_PATH, 'auth', 'reset-password'].join('/'),
    chat: {
      channelsPath: () => [BASE_API_PATH, 'chat', 'channels'].join('/'),
      messagesPath: (channelId: string) => [BASE_API_PATH, 'chat', 'channels', channelId, 'messages'].join('/'),
      messagePath: () => [BASE_API_PATH, 'chat', 'messages'].join('/'),
    },
  },
  rootPath: () => '/',
  loginPath: () => '/login',
  registerPath: () => '/register',
  forgotPasswordPath: () => '/forgot-password',
  resetPasswordPath: (token: string) => `/reset-password/${token}`,
};

export default routes;

export const appRoutes: RouteRecordRaw[] = [
  { path: routes.registerPath(), name: 'RegisterPage', component: () => import('@/pages/RegisterPage.vue') },
  { path: routes.loginPath(), name: 'LoginPage', component: () => import('@/pages/LoginPage.vue') },
  { path: '/reset-password/:token', name: 'ResetPasswordPage', component: () => import('@/pages/ResetPasswordPage.vue') },
  { path: routes.forgotPasswordPath(), name: 'ForgotPasswordPage', component: () => import('@/pages/ForgotPasswordPage.vue') },
  { path: routes.rootPath(), name: 'DashboardPage', component: () => import('@/pages/RootPage.vue') },
  { path: '/:path(.*)', redirect: routes.rootPath() },
];