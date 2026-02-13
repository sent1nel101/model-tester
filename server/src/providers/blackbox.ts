import axios from 'axios';
import type { ChatResponse, ModelInfo, StreamChunk } from '../../../shared/types.js';
import { config } from '../config.js';
import type { ProviderAdapter, ProviderChatRequest } from './types.js';
import { readStreamError } from './util.js';

const BASE_URL = 'https://api.blackbox.ai';
const CONNECT_TIMEOUT = 15_000;
const STREAM_IDLE_TIMEOUT = 60_000;

export class BlackboxProvider implements ProviderAdapter {
  name = 'blackbox' as const;
  displayName = 'Blackbox AI';

  private cachedModels: ModelInfo[] | null = null;

  isConfigured(): boolean {
    return config.blackboxApiKey.length > 0;
  }

  listModels(): ModelInfo[] {
    return this.cachedModels || [];
  }

  async fetchRemoteModels(): Promise<ModelInfo[]> {
    if (this.cachedModels) return this.cachedModels;
    try {
      const response = await axios.get(`${BASE_URL}/v1/models`, {
        headers: {
          'Authorization': `Bearer ${config.blackboxApiKey}`,
        },
        timeout: 10_000,
      });

      const rawModels = response.data?.data || response.data || [];
      const models: ModelInfo[] = (Array.isArray(rawModels) ? rawModels : []).map((m: any) => ({
        id: m.id || m.name || String(m),
        name: m.name || m.id || String(m),
        provider: 'blackbox' as const,
      }));

      // Sort alphabetically by name
      models.sort((a, b) => a.name.localeCompare(b.name));

      if (models.length > 0) {
        this.cachedModels = models;
      }
      return models;
    } catch (err: any) {
      console.error('Failed to fetch Blackbox models:', err.message);
      return [];
    }
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
      timeout: CONNECT_TIMEOUT,
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
    let response: any;

    try {
      response = await axios.post(`${BASE_URL}/chat/completions`, {
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
        timeout: CONNECT_TIMEOUT,
      });
    } catch (err: any) {
      yield { type: 'error', error: await readStreamError(err, 'Blackbox') };
      return;
    }

    let idleTimer: ReturnType<typeof setTimeout> = undefined!;
    const resetIdle = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        try { response.data.destroy(); } catch {}
      }, STREAM_IDLE_TIMEOUT);
    };
    resetIdle();

    let buffer = '';
    try {
      for await (const chunk of response.data) {
        resetIdle();
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;
          const jsonStr = trimmed.slice(6);
          if (jsonStr === '[DONE]') {
            clearTimeout(idleTimer);
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
    } catch (err: any) {
      clearTimeout(idleTimer);
      yield { type: 'error', error: `Blackbox stream interrupted: ${err.message}` };
      return;
    }

    clearTimeout(idleTimer);
    yield { type: 'done', latencyMs: Date.now() - startTime };
  }
}
