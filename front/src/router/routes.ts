import type { RouteRecordRaw } from 'vue-router';
import routes from '@/routes';

const appRoutes: RouteRecordRaw[] = [
  { path: '/:path(.*)', redirect: routes.rootPath() },
  {
    path: routes.rootPath(),
    component: () => import('@layouts/DefaultLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        component: () => import('@pages/RootPage.vue'),
        children: [
          { path: routes.shopPath(), name: 'ShopPage', component: () => import('@pages/ShopPage.vue') },
          {
            path: routes.profilePath(),
            name: 'ProfilePage',
            component: () => import('@pages/ProfilePage.vue'),
          },
        ],
      },
    ],
  },
  {
    path: routes.loginPath(),
    component: () => import('@pages/LoginPage.vue'),
  },
];

export default appRoutes;
