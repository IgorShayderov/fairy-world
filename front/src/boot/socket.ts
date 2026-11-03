import { io } from 'socket.io-client';

import { SESSION_CHANGED } from '@/modules/Auth/utils/session-events';
import { useChatStore } from '@/modules/Chat/store';

import { defineBoot } from '#q-app/wrappers';

export const socket = io(import.meta.env.VITE_BACK_URL, {
  autoConnect: false,
  withCredentials: true,
  transports: ['websocket'],
  auth: (callback) => callback({ token: localStorage.getItem('access_token') }),
});

function syncSocketSession() {
  if (!localStorage.getItem('access_token')) socket.disconnect();
  else if (!socket.connected) socket.connect();
}

export default defineBoot(() => {
  window.addEventListener(SESSION_CHANGED, syncSocketSession);
  // Boot files can be evaluated again during development hot reload. Ensure
  // there is still exactly one listener for each server event.
  socket.off('new_message');
  socket.on('new_message', (message) => {
    const chatStore = useChatStore();
    chatStore.receiveMessage(message);
  });

  socket.off('connect_error');
  socket.on('connect_error', (err) => {
    console.warn(`Ошибка WebSocket:`, err.message);
  });
});

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    window.removeEventListener(SESSION_CHANGED, syncSocketSession);
    socket.disconnect();
  });
}
