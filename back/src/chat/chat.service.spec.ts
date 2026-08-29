import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';

describe('ChatService', () => {
  let service: ChatService;

  const mockPrismaService = {
    channel: {
      findMany: jest.fn(),
    },
    message: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockChatGateway = {
    server: {
      emit: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    service = new ChatService(
      mockPrismaService as any,
      mockChatGateway as any,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getChannels', () => {
    it('should return all channels ordered by createdAt ascending', async () => {
      const channels = [
        { id: 'c1', name: 'general', createdAt: new Date('2024-01-01') },
        { id: 'c2', name: 'random', createdAt: new Date('2024-01-02') },
      ];
      mockPrismaService.channel.findMany.mockResolvedValue(channels);

      const result = await service.getChannels();

      expect(mockPrismaService.channel.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'asc' },
      });
      expect(result).toEqual(channels);
    });

    it('should return empty array when no channels exist', async () => {
      mockPrismaService.channel.findMany.mockResolvedValue([]);

      const result = await service.getChannels();

      expect(result).toEqual([]);
    });
  });

  describe('getMessages', () => {
    it('should return messages for a channel ordered by createdAt ascending', async () => {
      const channelId = 'c1';
      const messages = [
        { id: 'm1', channelId, text: 'hello', createdAt: new Date('2024-01-01') },
        { id: 'm2', channelId, text: 'world', createdAt: new Date('2024-01-02') },
      ];
      mockPrismaService.message.findMany.mockResolvedValue(messages);

      const result = await service.getMessages(channelId);

      expect(mockPrismaService.message.findMany).toHaveBeenCalledWith({
        where: { channelId },
        orderBy: { createdAt: 'asc' },
      });
      expect(result).toEqual(messages);
    });

    it('should return empty array when channel has no messages', async () => {
      mockPrismaService.message.findMany.mockResolvedValue([]);

      const result = await service.getMessages('empty-channel');

      expect(result).toEqual([]);
    });
  });

  describe('createMessage', () => {
    it('should create a message and emit it over the gateway', async () => {
      const channelId = 'c1';
      const text = 'new message';
      const savedMessage = {
        id: 'm3',
        channelId,
        text,
        createdAt: new Date('2024-01-03'),
      };
      mockPrismaService.message.create.mockResolvedValue(savedMessage);

      const result = await service.createMessage(channelId, text);

      expect(mockPrismaService.message.create).toHaveBeenCalledWith({
        data: { channelId, text },
      });
      expect(mockChatGateway.server.emit).toHaveBeenCalledWith(
        'new_message',
        savedMessage,
      );
      expect(result).toEqual(savedMessage);
    });

    it('should propagate errors from prisma create', async () => {
      mockPrismaService.message.create.mockRejectedValue(
        new Error('db failure'),
      );

      await expect(service.createMessage('c1', 'text')).rejects.toThrow(
        'db failure',
      );
      expect(mockChatGateway.server.emit).not.toHaveBeenCalled();
    });
  });
});
