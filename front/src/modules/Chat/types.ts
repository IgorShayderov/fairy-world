export interface Channel {
  id: string;
  name: string;
}

export interface Message {
  id: string;
  channelId: string;
  authorId: number;
  text: string;
  createdAt: string;
}
