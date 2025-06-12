import { createApp } from 'vue';
import { VueQueryPlugin } from '@tanstack/vue-query';
import dayjs from 'dayjs';
import I18nextVue from 'i18next-vue';
import App from '@/App.vue';
import router from '@/router';
import initI18n, { DEFAULT_LANGUAGE } from '@/i18n.ts';

import '@assets/scss/main.scss';

dayjs.locale(DEFAULT_LANGUAGE);

const vueQueryOptions = {
  enableDevtoolsV6Plugin: true,
  queryClientConfig: {
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        refetchOnMount: false,
      },
    },
  },
};

const app = createApp(App);

app.use(router);
app.use(I18nextVue, { i18next: initI18n() });
app.use(VueQueryPlugin, vueQueryOptions);
app.mount('#app');
