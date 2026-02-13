import type { ProviderName } from '../../../shared/types.js';
import { BlackboxProvider } from './blackbox.js';
import { ClaudeProvider } from './claude.js';
import { GeminiProvider } from './gemini.js';
import type { ProviderAdapter } from './types.js';

const providers: Record<ProviderName, ProviderAdapter> = {
  blackbox: new BlackboxProvider(),
  gemini: new GeminiProvider(),
  claude: new ClaudeProvider(),
};

export function getProvider(name: ProviderName): ProviderAdapter {
  const provider = providers[name];
  if (!provider) {
    throw new Error(`Unknown provider: ${name}`);
  }
  return provider;
}

export function getAllProviders(): ProviderAdapter[] {
  return Object.values(providers);
}
