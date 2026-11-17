import { WebSocketGateway, WebSocketServer, OnGatewayInit, OnGatewayConnection } from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { isAccessPayload, jwtSecret } from '../auth/token-security';
import type { AccessTokenPayload } from '../auth/interfaces/token-payload.interface';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONT_URL,
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayInit, OnGatewayConnection {
  constructor(private readonly jwt: JwtService) {}

  @WebSocketServer()
  server: Server;

  afterInit(server: Server) {
    server.use((socket, next) => {
      try {
        const token: unknown = socket.handshake.auth.token;
        if (typeof token !== 'string') throw new Error('Missing token');
        const payload = this.jwt.verify<AccessTokenPayload>(token, {
          secret: jwtSecret(),
          algorithms: ['HS256'],
        });
        if (!isAccessPayload(payload)) throw new Error('Invalid token type');
        (socket.data as { userId: number }).userId = payload.sub;
        next();
      } catch {
        next(new Error('Unauthorized'));
      }
    });
  }

  handleConnection(socket: Socket) {
    void socket.join(`user:${(socket.data as { userId: number }).userId}`);
  }

  notificationsChanged(userId: number) {
    this.server?.to(`user:${userId}`).emit('notifications_changed');
  }

  // Messages are created only by the authenticated, validated HTTP endpoint.
}
