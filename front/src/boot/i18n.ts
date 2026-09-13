import { defineBoot } from '@quasar/app-vite/wrappers';
import I18nextVue from 'i18next-vue';

import { i18n, initializeI18n } from '../locales/i18n';

export default defineBoot(async ({ app }) => {
  await initializeI18n();

  app.use(I18nextVue, { i18next: i18n });
});
