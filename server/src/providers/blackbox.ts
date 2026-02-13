import axios from 'axios';
import type { ChatResponse, ModelInfo, StreamChunk } from '../../../shared/types.js';
import { config } from '../config.js';
import type { ProviderAdapter, ProviderChatRequest } from './types.js';

const BASE_URL = 'https://api.blackbox.ai';

export class BlackboxProvider implements ProviderAdapter {
  name = 'blackbox' as const;
  displayName = 'Blackbox AI';

  isConfigured(): boolean {
    return config.blackboxApiKey.length > 0;
  }

  listModels(): ModelInfo[] {
    return [
      { id: 'gpt-4o', name: 'GPT-4o', provider: 'blackbox' },
      { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', provider: 'blackbox' },
      { id: 'gemini-pro', name: 'Gemini Pro', provider: 'blackbox' },
      { id: 'deepseek-ai/DeepSeek-V3', name: 'DeepSeek V3', provider: 'blackbox' },
      { id: 'deepseek-ai/DeepSeek-R1', name: 'DeepSeek R1', provider: 'blackbox' },
      { id: 'meta-llama/Llama-3.3-70B-Instruct-Turbo', name: 'LLaMA 3.3 70B', provider: 'blackbox' },
      { id: 'Qwen/QwQ-32B', name: 'Qwen QwQ 32B', provider: 'blackbox' },
    ];
  }

  async chat(request: ProviderChatRequest): Promise<ChatResponse> {
    const startTime = Date.now();

    const response = await axios.post(`${BASE_URL}/chat/completions`, {
      model: request.model,
      messages: request.messages,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens ?? 1024,
      stream: false,
    }, {
      headers: {
        'Authorization': `Bearer ${config.blackboxApiKey}`,
        'Content-Type': 'application/json',
      },
    });

    const latencyMs = Date.now() - startTime;
    const data = response.data;
    const choice = data.choices?.[0];

    return {
      content: choice?.message?.content || '',
      model: data.model || request.model,
      provider: 'blackbox',
      usage: {
        inputTokens: data.usage?.prompt_tokens || 0,
        outputTokens: data.usage?.completion_tokens || 0,
      },
      latencyMs,
      finishReason: choice?.finish_reason || 'stop',
    };
  }

  async *stream(request: ProviderChatRequest): AsyncGenerator<StreamChunk> {
    const startTime = Date.now();

    const response = await axios.post(`${BASE_URL}/chat/completions`, {
      model: request.model,
      messages: request.messages,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens ?? 1024,
      stream: true,
    }, {
      headers: {
        'Authorization': `Bearer ${config.blackboxApiKey}`,
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
        if (jsonStr === '[DONE]') {
          yield { type: 'done', latencyMs: Date.now() - startTime };
          return;
        }
        try {
          const parsed = JSON.parse(jsonStr);
          const delta = parsed.choices?.[0]?.delta;
          if (delta?.content) {
            yield { type: 'text', text: delta.content };
          }
          if (parsed.usage) {
            yield {
              type: 'usage',
              inputTokens: parsed.usage.prompt_tokens || 0,
              outputTokens: parsed.usage.completion_tokens || 0,
            };
          }
        } catch {
          // Skip malformed JSON lines
        }
      }
    }
    yield { type: 'done', latencyMs: Date.now() - startTime };
  }
}
