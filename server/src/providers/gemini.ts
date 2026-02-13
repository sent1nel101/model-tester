import axios from 'axios';
import type { ChatResponse, ModelInfo, StreamChunk } from '../../../shared/types.js';
import { config } from '../config.js';
import type { ProviderAdapter, ProviderChatRequest } from './types.js';

const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

export class GeminiProvider implements ProviderAdapter {
  name = 'gemini' as const;
  displayName = 'Google Gemini';

  isConfigured(): boolean {
    return config.geminiApiKey.length > 0;
  }

  listModels(): ModelInfo[] {
    return [
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'gemini' },
      { id: 'gemini-2.5-flash-preview-05-20', name: 'Gemini 2.5 Flash', provider: 'gemini' },
      { id: 'gemini-2.5-pro-preview-05-06', name: 'Gemini 2.5 Pro', provider: 'gemini' },
    ];
  }

  private transformMessages(messages: ProviderChatRequest['messages']) {
    const systemMsg = messages.find(m => m.role === 'system');
    const contents = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    return {
      contents,
      systemInstruction: systemMsg
        ? { parts: [{ text: systemMsg.content }] }
        : undefined,
    };
  }

  async chat(request: ProviderChatRequest): Promise<ChatResponse> {
    const startTime = Date.now();
    const { contents, systemInstruction } = this.transformMessages(request.messages);

    const response = await axios.post(
      `${BASE_URL}/models/${request.model}:generateContent`,
      {
        contents,
        systemInstruction,
        generationConfig: {
          temperature: request.temperature ?? 0.7,
          maxOutputTokens: request.maxTokens ?? 1024,
        },
      },
      {
        headers: {
          'x-goog-api-key': config.geminiApiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    const latencyMs = Date.now() - startTime;
    const data = response.data;
    const candidate = data.candidates?.[0];

    return {
      content: candidate?.content?.parts?.[0]?.text || '',
      model: request.model,
      provider: 'gemini',
      usage: {
        inputTokens: data.usageMetadata?.promptTokenCount || 0,
        outputTokens: data.usageMetadata?.candidatesTokenCount || 0,
      },
      latencyMs,
      finishReason: candidate?.finishReason || 'STOP',
    };
  }

  async *stream(request: ProviderChatRequest): AsyncGenerator<StreamChunk> {
    const startTime = Date.now();
    const { contents, systemInstruction } = this.transformMessages(request.messages);

    const response = await axios.post(
      `${BASE_URL}/models/${request.model}:streamGenerateContent?alt=sse`,
      {
        contents,
        systemInstruction,
        generationConfig: {
          temperature: request.temperature ?? 0.7,
          maxOutputTokens: request.maxTokens ?? 1024,
        },
      },
      {
        headers: {
          'x-goog-api-key': config.geminiApiKey,
          'Content-Type': 'application/json',
        },
        responseType: 'stream',
      }
    );

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
          const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            yield { type: 'text', text };
          }
          if (parsed.usageMetadata) {
            yield {
              type: 'usage',
              inputTokens: parsed.usageMetadata.promptTokenCount || 0,
              outputTokens: parsed.usageMetadata.candidatesTokenCount || 0,
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
