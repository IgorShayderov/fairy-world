import i18next from 'i18next';

import resources from './index';

export const i18n = i18next.createInstance();

export const initializeI18n = () => i18n.init({ lng: 'en', resources });
