import { defineBoot } from '@quasar/app-vite/wrappers';
import { VueQueryPlugin } from '@tanstack/vue-query';

export default defineBoot(({ app }) => {
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

  app.use(VueQueryPlugin, vueQueryOptions);
});
