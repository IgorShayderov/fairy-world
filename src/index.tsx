import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './components/App.tsx';

import './assets/scss/main.scss';

ReactDOM.createRoot(document.getElementById('app') as HTMLElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
);
