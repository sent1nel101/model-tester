import type { ChatRequest, ChatResponse, HealthStatus, ModelInfo, ScoreRequest, ScoreResponse, StreamChunk } from '../../../shared/types';

const BASE = '/api';

// Bypass the Vite proxy for streaming — go direct to Express.
// The proxy's selfHandleResponse mode closes SSE streams prematurely.
// CORS is handled by the server's cors() middleware.
const STREAM_BASE = 'http://localhost:3001/api';

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

  /**
   * Stream a chat completion using a callback pattern.
   * IMPORTANT: We do NOT pass the AbortSignal to fetch() because Chrome
   * aborts the body stream even after headers arrive.  Instead we cancel
   * the reader when the signal fires, which cleanly closes the connection.
   */
  async streamDirect(
    request: ChatRequest,
    onUpdate: (update: { text?: string; usage?: { inputTokens: number; outputTokens: number } }) => void,
    signal?: AbortSignal,
  ): Promise<{ text: string; latencyMs: number; usage: { inputTokens: number; outputTokens: number }; error: string | null }> {
    // Bail early if already aborted
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

    const url = `${STREAM_BASE}/stream`;

    // No signal on fetch — we handle cancellation via reader.cancel() below.
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }

    if (!res.body) {
      throw new Error('Response body is null — streaming not supported');
    }

    const reader = res.body.getReader();

    // Wire up abort → reader.cancel() so the connection closes cleanly
    const onAbort = () => reader.cancel();
    signal?.addEventListener('abort', onAbort);

    const decoder = new TextDecoder();
    let buffer = '';
    let accumulated = '';
    let latencyMs = 0;
    let usage = { inputTokens: 0, outputTokens: 0 };
    let error: string | null = null;

    try {
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
            switch (data.type) {
              case 'text':
                accumulated += data.text || '';
                onUpdate({ text: accumulated });
                break;
              case 'usage':
                usage = {
                  inputTokens: data.inputTokens || 0,
                  outputTokens: data.outputTokens || 0,
                };
                onUpdate({ usage });
                break;
              case 'done':
                latencyMs = data.latencyMs || 0;
                break;
              case 'error':
                error = data.error || 'Unknown error';
                break;
            }
          } catch {
            // skip malformed chunks
          }
        }
      }
    } finally {
      signal?.removeEventListener('abort', onAbort);
      reader.releaseLock();
    }

    return { text: accumulated, latencyMs, usage, error };
  },

  score(request: ScoreRequest): Promise<ScoreResponse> {
    return fetchJSON(`${BASE}/score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
  },
};
