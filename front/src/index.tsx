import React from 'react';
import ReactDOM from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import { Provider } from 'react-redux';

import App from './App.tsx';

import initI18n from './i18n.ts';
// import store from './slices';

import './assets/scss/main.scss';

const initApp = async () => {
  const i18n = await initI18n();

  ReactDOM.createRoot(document.getElementById('app') as HTMLElement).render(
    <React.StrictMode>
      {/* <Provider store={store}> */}
      <I18nextProvider i18n={i18n}>
        <App />
      </I18nextProvider>
      {/* </Provider> */}
    </React.StrictMode>
  );
};

initApp();
