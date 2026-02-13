import { Router } from 'express';
import type { ModelInfo, ProviderName } from '../../../shared/types.js';
import { getAllProviders, getProvider } from '../providers/index.js';

const router = Router();

router.get('/models', (_req, res) => {
  const models: Record<string, ModelInfo[]> = {};
  for (const provider of getAllProviders()) {
    if (provider.isConfigured()) {
      models[provider.name] = provider.listModels();
    }
  }
  res.json(models);
});

router.get('/models/:provider', (req, res) => {
  try {
    const provider = getProvider(req.params.provider as ProviderName);
    if (!provider.isConfigured()) {
      res.status(400).json({ error: `Provider ${req.params.provider} is not configured` });
      return;
    }
    res.json(provider.listModels());
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
