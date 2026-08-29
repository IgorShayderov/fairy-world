import { Test, TestingModule } from '@nestjs/testing';
import { ChatController, CreateMessageDto } from './chat.controller';
import { ChatService } from './chat.service';
import { AuthGuard } from '../auth/auth.guard';

describe('ChatController', () => {
  let controller: ChatController;

  const mockChatService = {
    getChannels: jest.fn(),
    getMessages: jest.fn(),
    createMessage: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatController],
      providers: [
        {
          provide: ChatService,
          useValue: mockChatService,
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ChatController>(ChatController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getChannels', () => {
    it('should return list of channels from service', async () => {
      const channels = [{ id: 'c1', name: 'general' }];
      mockChatService.getChannels.mockResolvedValue(channels);

      const result = await controller.getChannels();

      expect(mockChatService.getChannels).toHaveBeenCalled();
      expect(result).toEqual(channels);
    });
  });

  describe('getMessages', () => {
    it('should return messages for the given channel id', async () => {
      const channelId = 'c1';
      const messages = [{ id: 'm1', channelId, text: 'hi' }];
      mockChatService.getMessages.mockResolvedValue(messages);

      const result = await controller.getMessages(channelId);

      expect(mockChatService.getMessages).toHaveBeenCalledWith(channelId);
      expect(result).toEqual(messages);
    });
  });

  describe('createMessage', () => {
    it('should create a message and return the saved entity', async () => {
      const body: CreateMessageDto = { channelId: 'c1', text: 'hello' };
      const req = { user: { sub: 42, email: 'user@example.com' } };
      const saved = { id: 'm2', authorId: 42, channelId: 'c1', text: 'hello' };
      mockChatService.createMessage.mockResolvedValue(saved);

      const result = await controller.createMessage(req as never, body);

      expect(mockChatService.createMessage).toHaveBeenCalledWith(saved.authorId, 'c1', 'hello');
      expect(result).toEqual(saved);
    });
  });
});
