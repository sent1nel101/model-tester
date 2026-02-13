import type { ChatMessage, ChatResponse, ModelInfo, StreamChunk } from '../../../shared/types.js';

export interface ProviderChatRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
}

export interface ProviderAdapter {
  name: string;
  displayName: string;
  isConfigured(): boolean;
  listModels(): ModelInfo[];
  chat(request: ProviderChatRequest): Promise<ChatResponse>;
  stream(request: ProviderChatRequest): AsyncGenerator<StreamChunk>;
}
