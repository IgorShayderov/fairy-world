import i18n from 'i18next';
import resources from '@locales/index';

const DEFAULT_LANGUAGE = 'en';

const initI18n = () => {
  const i18nInstance = i18n.createInstance();

  i18nInstance.init({
    lng: DEFAULT_LANGUAGE,
    resources,
  });

  return i18nInstance;
};

export default initI18n;
export { DEFAULT_LANGUAGE };
