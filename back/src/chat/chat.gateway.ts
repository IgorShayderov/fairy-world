import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONT_URL,
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  afterInit() {
    console.log('✅ WebSocket Gateway успешно инициализирован');
  }

  handleConnection(client: Socket) {
    console.log(`🔌 Клиент подключился: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`❌ Клиент отключился: ${client.id}`);
  }

  // Обработчик события, если сообщение отправляется клиентом через WebSocket
  @SubscribeMessage('send_message')
  handleMessage(@MessageBody() payload: { channelId: string; text: string }) {
    const newMessage = {
      id: Date.now().toString(),
      channelId: payload.channelId,
      text: payload.text,
      createdAt: new Date().toISOString(),
    };

    // Отправляем сообщение ВСЕМ подключенным клиентам (включая отправителя)
    this.server.emit('new_message', newMessage);

    return newMessage;
  }
}
