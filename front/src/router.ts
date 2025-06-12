import { createRouter, createWebHistory } from 'vue-router';
import qs from 'qs';

import type { LocationQueryRaw } from 'vue-router';

const routes = [
  // { path: '/:path(.*)', redirect: paths.rootPath() },
  // path: paths.rootPath(),
  // name: 'Home',
  // meta: { roles: [], layout: 'AuthorizedUserLayout' },
  // component: () => import('@/pages/RootPage.vue'),
  // children: [
  //         {
  //     path: paths.eventPath(),
  //     name: 'Event',
  //     component: () => import('@/modules/Event/components/CurrentEvent.vue'),
  //     meta: { roles: [ORGANIZER_ROLE] },
  //   },
  // ]
];

const router = createRouter({
  history: createWebHistory(),
  routes,
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
