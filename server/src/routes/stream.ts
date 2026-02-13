import { Router } from 'express';
import type { ChatRequest, ProviderName } from '../../../shared/types.js';
import { getProvider } from '../providers/index.js';

const router = Router();

router.post('/stream', async (req, res) => {
  try {
    const { provider: providerName, model, messages, temperature, maxTokens } = req.body as ChatRequest;

    if (!providerName || !model || !messages?.length) {
      res.status(400).json({ error: 'Missing required fields: provider, model, messages' });
      return;
    }

    const provider = getProvider(providerName as ProviderName);
    if (!provider.isConfigured()) {
      res.status(400).json({ error: `Provider ${providerName} is not configured` });
      return;
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    const startTime = Date.now();
    let closed = false;

    req.on('close', () => {
      closed = true;
    });

    try {
      for await (const chunk of provider.stream({ model, messages, temperature, maxTokens })) {
        if (closed) break;
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }
    } catch (err: any) {
      if (!closed) {
        const errorMsg = err.response?.data?.error?.message || err.message || 'Stream error';
        res.write(`data: ${JSON.stringify({ type: 'error', error: errorMsg })}\n\n`);
      }
    }

    if (!closed) {
      res.write(`data: ${JSON.stringify({ type: 'done', latencyMs: Date.now() - startTime })}\n\n`);
      res.end();
    }
  } catch (err: any) {
    console.error('Stream setup error:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  }
});

export default router;
