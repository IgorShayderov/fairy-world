import type { RouteRecordRaw } from 'vue-router';
import routes from '@/routes';

const appRoutes: RouteRecordRaw[] = [
  { path: '/:path(.*)', redirect: routes.rootPath() },
  {
    path: routes.rootPath(),
    component: () => import('@pages/RootPage.vue'),
  },
  {
    path: routes.loginPath(),
    component: () => import('@pages/LoginPage.vue'),
  },
];

export default appRoutes;
