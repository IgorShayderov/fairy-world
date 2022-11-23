import './scss/main.scss';
import './scss/indentation.scss';
import './scss/buttons.scss';
import './scss/icons.scss';

import { createApp } from 'vue';
import mitt, { Emitter } from 'mitt';

import App from '@components/App.vue';
import { store } from '@src/store/main';

const app = createApp(App);

app.use(store);

type Events = {
  'close': void;
}

const emitter: Emitter<Events> = mitt<Events>();

app.config.globalProperties.emitter = emitter;

app.mount('#app');
