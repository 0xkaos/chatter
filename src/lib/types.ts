import { Message } from 'ai';

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  messages: Message[];
  createdAt: number;
  model: string;
  systemPrompt?: string;
}

export interface UserProfile {
  id: string;
  username: string;
  settings: {
    defaultModel: string;
    defaultSystemPrompt: string;
  };
}
