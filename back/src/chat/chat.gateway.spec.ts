import { ChatGateway } from './chat.gateway';
import type { Server } from 'socket.io';
import { JwtService } from '@nestjs/jwt';

describe('ChatGateway', () => {
  let gateway: ChatGateway;
  const jwt = { verify: jest.fn() };
  const originalSecret = process.env.JWT_SECRET;
  afterAll(() => {
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
  });

  const emitSpy = jest.fn();
  const mockServer = {
    emit: emitSpy,
  } as unknown as Server;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
    gateway = new ChatGateway(jwt as unknown as JwtService);
    gateway.server = mockServer;
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  it('has no unauthenticated client broadcast handler', () => {
    expect('handleMessage' in gateway).toBe(false);
  });

  it.each(['missing', 'refresh', 'invalid', 'access'])('authenticates %s connections', (type) => {
    const use = jest.fn<void, [(socket: unknown, next: (err?: Error) => void) => void]>();
    gateway.afterInit({ use } as unknown as Server);
    const middleware = use.mock.calls[0][0];
    jwt.verify.mockReturnValue({ sub: 1, email: 'user@example.com', type });
    if (type === 'invalid')
      jwt.verify.mockImplementationOnce(() => {
        throw new Error('bad signature');
      });
    const next = jest.fn();
    middleware({ handshake: { auth: type === 'missing' ? {} : { token: 'jwt' } } }, next);
    if (type === 'access') expect(next).toHaveBeenCalledWith();
    else expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});
