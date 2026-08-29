import { Test, TestingModule } from '@nestjs/testing';
import { ChatController, CreateMessageDto } from './chat.controller';
import { ChatService } from './chat.service';
import { AuthGuard } from '../auth/auth.guard';

describe('ChatController', () => {
  let controller: ChatController;

  const TEST_USER_ID = 42;
  const TEST_USER_EMAIL = 'user@example.com';
  const TEST_CHANNEL_ID = 'c1';
  const TEST_MESSAGE_ID = 'm2';

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
      const channels = [{ id: TEST_CHANNEL_ID, name: 'general' }];
      mockChatService.getChannels.mockResolvedValue(channels);

      const result = await controller.getChannels();

      expect(mockChatService.getChannels).toHaveBeenCalled();
      expect(result).toEqual(channels);
    });
  });

  describe('getMessages', () => {
    it('should return messages for the given channel id', async () => {
      const messages = [{ id: 'm1', channelId: TEST_CHANNEL_ID, text: 'hi' }];
      mockChatService.getMessages.mockResolvedValue(messages);

      const result = await controller.getMessages(TEST_CHANNEL_ID);

      expect(mockChatService.getMessages).toHaveBeenCalledWith(TEST_CHANNEL_ID);
      expect(result).toEqual(messages);
    });
  });

  describe('createMessage', () => {
    it('should create a message and return the saved entity', async () => {
      const body: CreateMessageDto = { channelId: TEST_CHANNEL_ID, text: 'hello' };
      const req = { user: { sub: TEST_USER_ID, email: TEST_USER_EMAIL } };
      const saved = { id: TEST_MESSAGE_ID, authorId: TEST_USER_ID, channelId: TEST_CHANNEL_ID, text: 'hello' };

      mockChatService.createMessage.mockResolvedValue(saved);

      const result = await controller.createMessage(req as never, body);

      expect(mockChatService.createMessage).toHaveBeenCalledWith(TEST_USER_ID, TEST_CHANNEL_ID, body.text);
      expect(result).toEqual(saved);
    });
  });
});
