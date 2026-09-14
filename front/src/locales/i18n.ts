import i18next from 'i18next';

import { StorageService } from '@/services/storage.service';

import resources from './index';

export const i18n = i18next.createInstance();

export const initializeI18n = () => {
  let language = 'en';
  try {
    if (StorageService.get('language') === 'ru') language = 'ru';
  } catch { /* Storage may be unavailable; English remains the default. */ }
  return i18n.init({ lng: language, fallbackLng: 'en', supportedLngs: ['en', 'ru'], resources });
};

export const changeLanguage = async (language: 'en' | 'ru') => {
  await i18n.changeLanguage(language);
  try { StorageService.set('language', language); }
  catch { /* Keep language switching usable when storage is unavailable. */ }
  if (typeof document !== 'undefined') document.documentElement.lang = language;
};

i18n.on('initialized', () => {
  if (typeof document !== 'undefined') document.documentElement.lang = i18n.language;
});
