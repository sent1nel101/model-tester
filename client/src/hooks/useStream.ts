import { useCallback, useRef, useState } from 'react';
import type { ChatRequest, StreamChunk } from '../../../shared/types';
import { api } from '../services/api';

export type StreamStatus = 'idle' | 'streaming' | 'done' | 'error';

export function useStream() {
  const [fullText, setFullText] = useState('');
  const [status, setStatus] = useState<StreamStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [latencyMs, setLatencyMs] = useState(0);
  const [usage, setUsage] = useState({ inputTokens: 0, outputTokens: 0 });
  const abortRef = useRef<AbortController | null>(null);
  const startTimeRef = useRef(0);

  const startStream = useCallback(async (request: ChatRequest) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setFullText('');
    setStatus('streaming');
    setError(null);
    setLatencyMs(0);
    setUsage({ inputTokens: 0, outputTokens: 0 });
    startTimeRef.current = Date.now();

    let accumulated = '';

    try {
      for await (const chunk of api.stream(request, abortRef.current.signal)) {
        switch (chunk.type) {
          case 'text':
            accumulated += chunk.text || '';
            setFullText(accumulated);
            break;
          case 'usage':
            setUsage(prev => ({
              inputTokens: (chunk.inputTokens || 0) || prev.inputTokens,
              outputTokens: (chunk.outputTokens || 0) || prev.outputTokens,
            }));
            break;
          case 'done':
            setLatencyMs(chunk.latencyMs || Date.now() - startTimeRef.current);
            setStatus('done');
            return accumulated;
          case 'error':
            setError(chunk.error || 'Unknown stream error');
            setStatus('error');
            return accumulated;
        }
      }
      // If we reach here without 'done', mark as done
      setLatencyMs(Date.now() - startTimeRef.current);
      setStatus('done');
      return accumulated;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setStatus('done');
        return accumulated;
      }
      setError(err.message);
      setStatus('error');
      return accumulated;
    }
  }, []);

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
  }, []);

  return { fullText, status, error, latencyMs, usage, startStream, cancel, reset };
}
