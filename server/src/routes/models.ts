import { Router } from 'express';
import type { ModelInfo, ProviderName } from '../../../shared/types.js';
import { getAllProviders, getProvider } from '../providers/index.js';
import { BlackboxProvider } from '../providers/blackbox.js';

const router = Router();

router.get('/models', async (_req, res) => {
  const models: Record<string, ModelInfo[]> = {};
  for (const provider of getAllProviders()) {
    if (provider.isConfigured()) {
      // Use dynamic fetch for providers that support it
      if (provider instanceof BlackboxProvider) {
        models[provider.name] = await provider.fetchRemoteModels();
      } else {
        models[provider.name] = provider.listModels();
      }
    }
  }
  res.json(models);
});

router.get('/models/:provider', async (req, res) => {
  try {
    const provider = getProvider(req.params.provider as ProviderName);
    if (!provider.isConfigured()) {
      res.status(400).json({ error: `Provider ${req.params.provider} is not configured` });
      return;
    }
    if (provider instanceof BlackboxProvider) {
      res.json(await provider.fetchRemoteModels());
    } else {
      res.json(provider.listModels());
    }
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
