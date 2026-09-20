export interface Channel {
  id: string;
  name: string;
}

export interface Message {
  id: string;
  channelId: string;
  authorId: number;
  author?: {
    id: number;
    name: string;
  };
  text: string;
  createdAt: string;
}
