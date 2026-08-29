import locales from '@locales';
import i18next from 'i18next';
import I18NextVue from 'i18next-vue';

import { defineBoot } from '#q-app/wrappers';

export default defineBoot(async ({ app }) => {
  await i18next.init({
    lng: 'ru',
    fallbackLng: 'ru',
    resources: {
      en: { translation: locales.en },
      ru: { translation: locales.ru },
    },
  });

  app.use(I18NextVue, { i18next });
});
