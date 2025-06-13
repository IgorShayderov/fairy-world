import { defineBoot } from '@quasar/app-vite/wrappers';
import i18n from 'i18next';
import I18nextVue from 'i18next-vue';
import resources from '@locales/index';

export default defineBoot(async ({ app }) => {
  const i18nInstance = i18n.createInstance();
  const DEFAULT_LANGUAGE = 'en';

  await i18nInstance.init({
    lng: DEFAULT_LANGUAGE,
    resources,
  });

  app.use(I18nextVue, { i18next: i18nInstance });
});
