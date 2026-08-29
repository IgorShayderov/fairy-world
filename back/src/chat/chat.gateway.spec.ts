import { ChatGateway } from './chat.gateway';
import type { Server } from 'socket.io';

describe('ChatGateway', () => {
  let gateway: ChatGateway;

  const emitSpy = jest.fn();
  const mockServer = {
    emit: emitSpy,
  } as unknown as Server;

  beforeEach(() => {
    jest.clearAllMocks();
    gateway = new ChatGateway();
    gateway.server = mockServer;
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('handleMessage', () => {
    it('should emit new_message to all clients and return the message', () => {
      const payload = { channelId: 'c1', text: 'hello' };

      const result = gateway.handleMessage(payload);

      expect(result).toMatchObject({
        channelId: 'c1',
        text: 'hello',
      });
      expect(typeof result.id).toBe('string');
      expect(result.createdAt).toBeDefined();
      expect(emitSpy).toHaveBeenCalledWith('new_message', result);
    });

    it('should preserve channelId and text from the payload', () => {
      const payload = { channelId: 'xyz', text: 'another message' };

      const result = gateway.handleMessage(payload);

      expect(result.channelId).toBe('xyz');
      expect(result.text).toBe('another message');
    });
  });

  describe('lifecycle hooks', () => {
    it('handleConnection should not throw', () => {
      const fakeClient = { id: 'socket-1' };
      expect(() => gateway.handleConnection(fakeClient as never)).not.toThrow();
    });

    it('handleDisconnect should not throw', () => {
      const fakeClient = { id: 'socket-2' };
      expect(() => gateway.handleDisconnect(fakeClient as never)).not.toThrow();
    });

    it('afterInit should not throw', () => {
      expect(() => gateway.afterInit()).not.toThrow();
    });
  });
});
