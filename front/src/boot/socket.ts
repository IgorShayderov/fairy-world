import { defineBoot } from '#q-app/wrappers';
import { io } from 'socket.io-client';
import { useChatStore } from '@/modules/Chat/store';

export default defineBoot(() => {
  const socket = io({
    autoConnect: false,
  });

  socket.connect();

  socket.on('new_message', (message) => {
    const chatStore = useChatStore();

    chatStore.receiveMessage(message);
  });

  socket.on('connect_error', (err) => {
    console.warn('Ошибка подключения к WebSocket:', err.message);
  });
});
