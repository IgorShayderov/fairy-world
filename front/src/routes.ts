import type { RouteRecordRaw } from 'vue-router';

const BASE_API_PATH = `${import.meta.env.VITE_BACK_URL}/api/v1`;
const BASE_AUTH_PATH = `${BASE_API_PATH}/auth`;

const routes = {
  api: {
    crafting: {
      detailsPath: () => [BASE_API_PATH, 'crafting'].join('/'),
      craftPath: (recipeId: number) => [BASE_API_PATH, 'crafting', 'recipes', String(recipeId), 'craft'].join('/'),
      applyUpgradePath: () => [BASE_API_PATH, 'crafting', 'upgrades', 'apply'].join('/'),
    },
    quests: {
      deliverPath: (id: number) => [BASE_API_PATH, 'quests', id, 'deliver'].join('/'),
      refreshPath: () => [BASE_API_PATH, 'quests', 'refresh'].join('/'),
      listPath: () => [BASE_API_PATH, 'quests'].join('/'),
      acceptPath: (id: number) => [BASE_API_PATH, 'quests', id, 'accept'].join('/'),
      cancelPath: (id: number) => [BASE_API_PATH, 'quests', id, 'cancel'].join('/'),
    },
    auth: {
      signInPath: () => [BASE_AUTH_PATH, 'login'].join('/'),
      signUpPath: () => [BASE_AUTH_PATH, 'register'].join('/'),
      refreshPath: () => [BASE_AUTH_PATH, 'refresh'].join('/'),
      logoutPath: () => [BASE_AUTH_PATH, 'logout'].join('/'),
    },
    passwords: {
      forgotPasswordPath: () => [BASE_API_PATH, 'passwords', 'forgot'].join('/'),
      resetPasswordPath: () => [BASE_API_PATH, 'passwords', 'reset'].join('/'),
    },
    chat: {
      channelsPath: () => [BASE_API_PATH, 'chat', 'channels'].join('/'),
      messagesPath: (channelId: string) => [BASE_API_PATH, 'chat', 'channels', channelId, 'messages'].join('/'),
      messagePath: () => [BASE_API_PATH, 'chat', 'messages'].join('/'),
    },
    users: {
      leaderboardPath: () => [BASE_API_PATH, 'users', 'leaderboard'].join('/'),
      devGemsPath: () => [BASE_API_PATH, 'users', 'me', 'dev-gems'].join('/'),
      mePath: () => [BASE_API_PATH, 'users', 'me'].join('/'),
      attributesPath: () => [BASE_API_PATH, 'users', 'me', 'attributes'].join('/'),
      consumeInventoryItemPath: (inventoryItemId: number) =>
        [BASE_API_PATH, 'users', 'me', 'inventory', String(inventoryItemId), 'consume'].join('/'),
      dropInventoryItemPath: (inventoryItemId: number) =>
        [BASE_API_PATH, 'users', 'me', 'inventory', String(inventoryItemId)].join('/'),
      replaceInventoryItemPath: () => [BASE_API_PATH, 'users', 'me', 'inventory', 'replace'].join('/'),
      mapPositionPath: () => [BASE_API_PATH, 'users', 'me', 'map-position'].join('/'),
      equipmentPath: () => [BASE_API_PATH, 'users', 'me', 'equipment'].join('/'),
      equipmentSlotPath: (slot: string) => [BASE_API_PATH, 'users', 'me', 'equipment', slot].join('/'),
    },
    locations: {
      blessingPath: (id: number) => [BASE_API_PATH, 'locations', 'sanctuaries', String(id), 'blessing'].join('/'),
      listPath: () => [BASE_API_PATH, 'locations'].join('/'),
      mePath: () => [BASE_API_PATH, 'locations', 'me'].join('/'),
    },
    monsters: {
      activeDungeonPath: () => [BASE_API_PATH, 'monsters', 'dungeon', 'active'].join('/'),
      dungeonOpponentAttackPath: (runId: string, opponentId: string) =>
        [BASE_API_PATH, 'monsters', 'dungeon', 'run', runId, 'opponents', opponentId, 'attack'].join('/'),
      dungeonResetPath: (name: string) => [BASE_API_PATH, 'monsters', 'dungeon', name, 'reset'].join('/'),
      dungeonPath: (name: string) => [BASE_API_PATH, 'monsters', 'dungeon', name].join('/'),
      listPath: () => [BASE_API_PATH, 'monsters'].join('/'),
      byIdPath: (id: number) => [BASE_API_PATH, 'monsters', String(id)].join('/'),
      encounterPath: () => [BASE_API_PATH, 'monsters', 'encounter'].join('/'),
      battleAttackPath: (battleId: string) => [BASE_API_PATH, 'monsters', 'battle', battleId, 'attack'].join('/'),
      battleRetreatPath: (battleId: string) => [BASE_API_PATH, 'monsters', 'battle', battleId, 'retreat'].join('/'),
    },
    shop: {
      detailsPath: (shopId: number) => [BASE_API_PATH, 'shop', shopId].join('/'),
      buyPath: (shopId: number) => [BASE_API_PATH, 'shop', shopId, 'buy'].join('/'),
      sellPath: (shopId: number) => [BASE_API_PATH, 'shop', shopId, 'sell'].join('/'),
      sellManyPath: (shopId: number) => [BASE_API_PATH, 'shop', shopId, 'sell-many'].join('/'),
      refreshPath: (shopId: number) => [BASE_API_PATH, 'shop', shopId, 'refresh'].join('/'),
    },
  },
  rootPath: () => '/',
  settingsPath: () => '/settings',
  leaderboardPath: () => '/leaderboard',
  craftPath: () => '/craft',
  questsPath: () => '/quests',
  loginPath: () => '/login',
  profilePath: () => '/profile',
  shopPath: () => '/shop',
  gemShopPath: () => '/gems',
  registerPath: () => '/register',
  forgotPasswordPath: () => '/forgot-password',
  resetPasswordPath: () => `/reset-password`,
};

export default routes;

export const appRoutes: RouteRecordRaw[] = [
  { path: routes.registerPath(), name: 'RegisterPage', component: () => import('@/pages/RegisterPage.vue') },
  { path: routes.loginPath(), name: 'LoginPage', component: () => import('@/pages/LoginPage.vue') },
  { path: routes.rootPath(), name: 'RootPage', component: () => import('@/pages/RootPage.vue') },
  { path: '/:path(.*)', redirect: routes.rootPath() },
];
