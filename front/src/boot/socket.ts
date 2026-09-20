import { io } from 'socket.io-client';

import { useChatStore } from '@/modules/Chat/store';

import { defineBoot } from '#q-app/wrappers';

export const socket = io(import.meta.env.VITE_BACK_URL, {
  autoConnect: false,
  withCredentials: true,
  transports: ['websocket'],
});

export default defineBoot(() => {
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
