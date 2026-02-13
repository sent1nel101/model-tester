import { Router } from 'express';
import type { HealthStatus } from '../../../shared/types.js';
import { getAllProviders } from '../providers/index.js';

const router = Router();

router.get('/health', (_req, res) => {
  const status: HealthStatus = {
    providers: getAllProviders().map(p => ({
      name: p.name as HealthStatus['providers'][0]['name'],
      configured: p.isConfigured(),
      displayName: p.displayName,
    })),
  };
  res.json(status);
});

export default router;
