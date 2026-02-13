import type { ChatRequest, ChatResponse, HealthStatus, ModelInfo, ScoreRequest, ScoreResponse, StreamChunk } from '../../../shared/types';

const BASE = '/api';

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  getHealth(): Promise<HealthStatus> {
    return fetchJSON(`${BASE}/health`);
  },

  getModels(): Promise<Record<string, ModelInfo[]>> {
    return fetchJSON(`${BASE}/models`);
  },

  chat(request: ChatRequest): Promise<ChatResponse> {
    return fetchJSON(`${BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
  },

  async *stream(request: ChatRequest, signal?: AbortSignal): AsyncGenerator<StreamChunk> {
    const res = await fetch(`${BASE}/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n\n');
      buffer = parts.pop() || '';

      for (const part of parts) {
        const trimmed = part.trim();
        if (!trimmed.startsWith('data: ')) continue;
        try {
          const data: StreamChunk = JSON.parse(trimmed.slice(6));
          yield data;
        } catch {
          // skip malformed
        }
      }
    }
  },

  score(request: ScoreRequest): Promise<ScoreResponse> {
    return fetchJSON(`${BASE}/score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
  },
};
