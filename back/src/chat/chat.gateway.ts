import { WebSocketGateway, WebSocketServer, OnGatewayInit } from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server } from 'socket.io';
import { isAccessPayload, jwtSecret } from '../auth/token-security';
import type { AccessTokenPayload } from '../auth/interfaces/token-payload.interface';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONT_URL,
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayInit {
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
        next();
      } catch {
        next(new Error('Unauthorized'));
      }
    });
  }

  // Messages are created only by the authenticated, validated HTTP endpoint.
}
