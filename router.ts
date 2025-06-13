import { createRouter, createWebHistory } from 'vue-router';
import qs from 'qs';
import type { LocationQueryRaw } from 'vue-router';
import routes from './routes';

const appRoutes = [
  {
    path: '/:path(.*)',
    component: () => import('@pages/NotFoundPage.vue'),
  },
  {
    path: routes.rootPath(),
    name: 'Root',
    component: () => import('@pages/RootPage.vue'),
  },
  {
    path: routes.rootPath(),
    name: 'Root',
    component: () => import('@pages/LoginPage.vue'),
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes: appRoutes,
  parseQuery: (query: string) => qs.parse(query),
  stringifyQuery: (query: LocationQueryRaw) => qs.stringify(query, { encodeValuesOnly: true }),
});

router.beforeEach((from) => {
  // const privateRoutes = [];
  // const publicRoutes = [];
  // const token = localStorage.getItem('acess_token');
  // if (!token && requireAuthRoutes.includes(from.name as string)) {
  //   return { name: 'Login' };
  // } else if (token && noAuthRoutes.includes(from.name as string)) {
  //   return { name: 'Home' };
  // }
});

export default router;
