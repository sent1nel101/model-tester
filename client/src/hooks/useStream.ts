import { useCallback, useRef, useState } from 'react';
import type { ChatRequest } from '../../../shared/types';
import { api } from '../services/api';

export type StreamStatus = 'idle' | 'streaming' | 'done' | 'error';

const CLIENT_TIMEOUT = 95_000; // Slightly above the server's 90s hard timeout

export function useStream() {
  const [fullText, setFullText] = useState('');
  const [status, setStatus] = useState<StreamStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [latencyMs, setLatencyMs] = useState(0);
  const [usage, setUsage] = useState({ inputTokens: 0, outputTokens: 0 });
  const [usedFallback, setUsedFallback] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const startTimeRef = useRef(0);

  // Fallback: try the non-streaming /api/chat endpoint
  const tryFallback = useCallback(async (request: ChatRequest): Promise<string | null> => {
    try {
      setUsedFallback(true);
      setError(null);
      const result = await api.chat(request);
      setFullText(result.content);
      setLatencyMs(result.latencyMs);
      setUsage(result.usage);
      setStatus('done');
      return result.content;
    } catch {
      setUsedFallback(false);
      return null; // Fallback also failed
    }
  }, []);

  const startStream = useCallback(async (request: ChatRequest) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setFullText('');
    setStatus('streaming');
    setError(null);
    setLatencyMs(0);
    setUsage({ inputTokens: 0, outputTokens: 0 });
    setUsedFallback(false);
    startTimeRef.current = Date.now();

    // Client-side timeout
    const timeoutId = setTimeout(() => {
      abortRef.current?.abort();
    }, CLIENT_TIMEOUT);

    try {
      const result = await api.streamDirect(
        request,
        (update) => {
          if (update.text !== undefined) setFullText(update.text);
          if (update.usage) setUsage(update.usage);
        },
        abortRef.current.signal,
      );

      clearTimeout(timeoutId);

      if (result.error) {
        if (!result.text) {
          const fallbackResult = await tryFallback(request);
          if (fallbackResult) return fallbackResult;
        }
        setError(result.error);
        setStatus('error');
        return result.text;
      }

      setLatencyMs(result.latencyMs || Date.now() - startTimeRef.current);
      setStatus('done');
      return result.text;
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.error('[useStream] error:', err.name, err.message);

      if (err.name === 'AbortError') {
        // If abort was from our timeout (not user cancel), try fallback
        if (Date.now() - startTimeRef.current >= CLIENT_TIMEOUT - 1000) {
          const fallbackResult = await tryFallback(request);
          if (fallbackResult) return fallbackResult;
          setError('Request timed out');
          setStatus('error');
          return '';
        }
        setStatus('done');
        return '';
      }

      // Stream fetch failed — try non-streaming fallback
      const fallbackResult = await tryFallback(request);
      if (fallbackResult) return fallbackResult;
      setError(err.message);
      setStatus('error');
      return '';
    }
  }, [tryFallback]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setStatus('done');
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setFullText('');
    setStatus('idle');
    setError(null);
    setLatencyMs(0);
    setUsage({ inputTokens: 0, outputTokens: 0 });
    setUsedFallback(false);
  }, []);

  return { fullText, status, error, latencyMs, usage, usedFallback, startStream, cancel, reset };
}
