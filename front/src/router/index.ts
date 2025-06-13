import { defineRouter } from '#q-app/wrappers';
import { createMemoryHistory, createRouter, createWebHistory } from 'vue-router';
import routes from './routes';
import qs from 'qs';

import type { LocationQueryRaw } from 'vue-router';

/*
 * If not building with SSR mode, you can
 * directly export the Router instantiation;
 *
 * The function below can be async too; either use
 * async/await or return a Promise which resolves
 * with the Router instance.
 */

export default defineRouter(function (/* { store, ssrContext } */) {
  const createHistory = process.env.SERVER ? createMemoryHistory : createWebHistory;

  const Router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,
    // Leave this as is and make changes in quasar.conf.js instead!
    // quasar.conf.js -> build -> vueRouterMode
    // quasar.conf.js -> build -> publicPath
    history: createHistory(process.env.VUE_ROUTER_BASE),
    parseQuery: (query: string) => qs.parse(query),
    stringifyQuery: (query: LocationQueryRaw) => qs.stringify(query, { encodeValuesOnly: true }),
  });

  Router.beforeEach(() => {
    // const privateRoutes = [
    // ];
    // const publicRoutes = [
    //   'Login',
    //   'Support',
    //   'UpdatePassword',
    //   'CreatePassword',
    //   // 'ConfirmEmail'
    // ];
    // const token = localStorage.getItem('acess_token');
    // if (!token && requireAuthRoutes.includes(from.name as string)) {
    //   return { name: 'Login' };
    // } else if (token && noAuthRoutes.includes(from.name as string)) {
    //   return { name: 'Home' };
    // }
  });

  return Router;
});
