const BASE_API_PATH = `${import.meta.env.VITE_BACK_URL}/api/v1`;

const routes = {
  api: {
    signInPath: () => [BASE_API_PATH, 'auth', 'login'].join('/'),
    signUpPath: () => [BASE_API_PATH, 'auth', 'register'].join('/'),
  },
  rootPath: () => '/',
  loginPath: () => '/login',
};

export default routes;

// Vue Router routes (shared for convenience)
import type { RouteRecordRaw } from 'vue-router';

export const appRoutes: RouteRecordRaw[] = [
  { path: '/login', name: 'LoginPage', component: () => import('@/pages/LoginPage.vue') },
  { path: '/dashboard', name: 'DashboardPage', component: () => import('@/pages/RootPage.vue') },
  { path: '/:path(.*)', redirect: '/' },
];
