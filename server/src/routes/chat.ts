import { Router } from 'express';
import type { ChatRequest, ProviderName } from '../../../shared/types.js';
import { getProvider } from '../providers/index.js';

const router = Router();

router.post('/chat', async (req, res) => {
  try {
    const { provider: providerName, model, messages, temperature, maxTokens } = req.body as ChatRequest;

    if (!providerName || !model || !messages?.length) {
      res.status(400).json({ error: 'Missing required fields: provider, model, messages' });
      return;
    }

    const provider = getProvider(providerName as ProviderName);
    if (!provider.isConfigured()) {
      res.status(400).json({ error: `Provider ${providerName} is not configured. Add its API key to .env` });
      return;
    }

    const result = await provider.chat({ model, messages, temperature, maxTokens });
    res.json(result);
  } catch (err: any) {
    console.error('Chat error:', err.response?.data || err.message);
    const status = err.response?.status || 500;
    const message = err.response?.data?.error?.message || err.message || 'Internal server error';
    res.status(status).json({ error: message });
  }
});

export default router;
