import { ChatGateway } from './chat.gateway';

describe('ChatGateway', () => {
  let gateway: ChatGateway;

  const mockServer = {
    emit: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    gateway = new ChatGateway();
    (gateway as any).server = mockServer;
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
      expect(mockServer.emit).toHaveBeenCalledWith('new_message', result);
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
      const fakeClient = { id: 'socket-1' } as any;
      expect(() => gateway.handleConnection(fakeClient)).not.toThrow();
    });

    it('handleDisconnect should not throw', () => {
      const fakeClient = { id: 'socket-2' } as any;
      expect(() => gateway.handleDisconnect(fakeClient)).not.toThrow();
    });

    it('afterInit should not throw', () => {
      expect(() => gateway.afterInit()).not.toThrow();
    });
  });
});
