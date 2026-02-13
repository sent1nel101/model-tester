import { Router } from 'express';
import type { ChatRequest, ProviderName } from '../../../shared/types.js';
import { getProvider } from '../providers/index.js';

const router = Router();

// SSE streaming handler.
// Uses a synchronous Express handler with a detached async IIFE.
// Does NOT listen to req.on('close') — express.json() consumes the body,
// causing Node to emit 'close' on the request stream immediately.
router.post('/stream', (req, res) => {
  const { provider: providerName, model, messages, temperature, maxTokens } = req.body as ChatRequest;

  if (!providerName || !model || !messages?.length) {
    res.status(400).json({ error: 'Missing required fields: provider, model, messages' });
    return;
  }

  let provider;
  try {
    provider = getProvider(providerName as ProviderName);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
    return;
  }

  if (!provider.isConfigured()) {
    res.status(400).json({ error: `Provider ${providerName} is not configured. Add its API key to server/.env` });
    return;
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
  });
  res.flushHeaders();

  console.log(`[stream] START ${providerName}/${model}`);
  const startTime = Date.now();

  void (async () => {
    try {
      for await (const chunk of provider.stream({ model, messages, temperature, maxTokens })) {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        if (chunk.type === 'error' || chunk.type === 'done') {
          console.log(`[stream] PROVIDER ${chunk.type.toUpperCase()} ${providerName}/${model}`);
          break;
        }
      }
    } catch (err: any) {
      console.error(`[stream] ERROR ${providerName}/${model}:`, err.message);
      try { res.write(`data: ${JSON.stringify({ type: 'error', error: err.message || 'Stream failed' })}\n\n`); } catch {}
    }

    const latencyMs = Date.now() - startTime;
    try {
      res.write(`data: ${JSON.stringify({ type: 'done', latencyMs })}\n\n`);
      res.end();
    } catch {}
    console.log(`[stream] END ${providerName}/${model}: ${latencyMs}ms`);
  })();
});

export default router;
