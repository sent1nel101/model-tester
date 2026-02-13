import axios from 'axios';
import type { ChatResponse, ModelInfo, StreamChunk } from '../../../shared/types.js';
import { config } from '../config.js';
import type { ProviderAdapter, ProviderChatRequest } from './types.js';

const BASE_URL = 'https://api.anthropic.com/v1';

export class ClaudeProvider implements ProviderAdapter {
  name = 'claude' as const;
  displayName = 'Anthropic Claude';

  isConfigured(): boolean {
    return config.claudeApiKey.length > 0;
  }

  listModels(): ModelInfo[] {
    return [
      { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', provider: 'claude' },
      { id: 'claude-haiku-4-20250514', name: 'Claude Haiku 4', provider: 'claude' },
      { id: 'claude-opus-4-20250514', name: 'Claude Opus 4', provider: 'claude' },
    ];
  }

  async chat(request: ProviderChatRequest): Promise<ChatResponse> {
    const startTime = Date.now();
    const systemMsg = request.messages.find(m => m.role === 'system');
    const nonSystemMessages = request.messages.filter(m => m.role !== 'system');

    const response = await axios.post(`${BASE_URL}/messages`, {
      model: request.model,
      max_tokens: request.maxTokens ?? 1024,
      messages: nonSystemMessages,
      system: systemMsg?.content,
      temperature: request.temperature ?? 0.7,
    }, {
      headers: {
        'x-api-key': config.claudeApiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
    });

    const latencyMs = Date.now() - startTime;
    const data = response.data;

    return {
      content: data.content?.[0]?.text || '',
      model: data.model || request.model,
      provider: 'claude',
      usage: {
        inputTokens: data.usage?.input_tokens || 0,
        outputTokens: data.usage?.output_tokens || 0,
      },
      latencyMs,
      finishReason: data.stop_reason || 'end_turn',
    };
  }

  async *stream(request: ProviderChatRequest): AsyncGenerator<StreamChunk> {
    const startTime = Date.now();
    const systemMsg = request.messages.find(m => m.role === 'system');
    const nonSystemMessages = request.messages.filter(m => m.role !== 'system');

    const response = await axios.post(`${BASE_URL}/messages`, {
      model: request.model,
      max_tokens: request.maxTokens ?? 1024,
      messages: nonSystemMessages,
      system: systemMsg?.content,
      temperature: request.temperature ?? 0.7,
      stream: true,
    }, {
      headers: {
        'x-api-key': config.claudeApiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      responseType: 'stream',
    });

    let buffer = '';
    for await (const chunk of response.data) {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        const jsonStr = trimmed.slice(6);
        try {
          const parsed = JSON.parse(jsonStr);
          if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
            yield { type: 'text', text: parsed.delta.text };
          }
          if (parsed.type === 'message_delta' && parsed.usage) {
            yield {
              type: 'usage',
              outputTokens: parsed.usage.output_tokens || 0,
              inputTokens: 0,
            };
          }
          if (parsed.type === 'message_start' && parsed.message?.usage) {
            yield {
              type: 'usage',
              inputTokens: parsed.message.usage.input_tokens || 0,
              outputTokens: 0,
            };
          }
        } catch {
          // Skip malformed JSON
        }
      }
    }
    yield { type: 'done', latencyMs: Date.now() - startTime };
  }
}
