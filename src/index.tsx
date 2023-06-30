import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './components/App.tsx';

import './scss/main.scss';
import './scss/indentation.scss';
import './scss/buttons.scss';
import './scss/icons.scss';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
);
// const emitter: Emitter<Events> = mitt<Events>();
