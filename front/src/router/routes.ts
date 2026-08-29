import type { RouteRecordRaw } from 'vue-router';
import routes from '@/routes';

const appRoutes: RouteRecordRaw[] = [
  { path: '/:path(.*)', redirect: routes.rootPath() },
  {
    path: routes.rootPath(),
    component: () => import('@layouts/DefaultLayout.vue'),
    meta: { requiresAuth: true, layout: 'AuthLayout' },
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
    name: 'LoginPage',
    path: routes.loginPath(),
    component: () => import('@pages/LoginPage.vue'),
    meta: { layout: 'UnauthLayout' },
  },
  {
    name: 'ForgotPasswordPage',
    path: routes.forgotPasswordPath(),
    component: () => import('@pages/ForgotPasswordPage.vue'),
    meta: { layout: 'UnauthLayout' },
  },
  {
    name: 'RegisterPage',
    path: routes.registerPath(),
    component: () => import('@pages/RegisterPage.vue'),
    meta: { layout: 'UnauthLayout' },
  },
  {
    name: 'ResetPasswordPage',
    path: routes.resetPasswordPath(),
    component: () => import('@pages/ResetPasswordPage.vue'),
    meta: { layout: 'UnauthLayout' },
  },
];

export default appRoutes;
