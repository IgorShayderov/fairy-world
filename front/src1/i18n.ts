import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import resources from './locales/index';

const initI18n = () => {
  const defaultLanguage = 'en';
  const i18nInstance = i18n.createInstance();

  i18nInstance.use(initReactI18next).init({
    lng: defaultLanguage,
    resources,
  });

  return i18nInstance;
};

export default initI18n;
