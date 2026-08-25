export interface Channel {
  id: string;
  name: string;
}

export interface Message {
  id: string;
  channelId: string;
  text: string;
  createdAt: string;
}
