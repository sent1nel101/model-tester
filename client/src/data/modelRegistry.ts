import type { ProviderName } from '../../../shared/types';

export interface ModelRegistryEntry {
  displayName: string;
  models: { id: string; name: string }[];
  supportsCustomModel: boolean;
}

export const MODEL_REGISTRY: Record<ProviderName, ModelRegistryEntry> = {
  blackbox: {
    displayName: 'Blackbox AI',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o' },
      { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4' },
      { id: 'gemini-pro', name: 'Gemini Pro' },
      { id: 'deepseek-ai/DeepSeek-V3', name: 'DeepSeek V3' },
      { id: 'deepseek-ai/DeepSeek-R1', name: 'DeepSeek R1' },
      { id: 'meta-llama/Llama-3.3-70B-Instruct-Turbo', name: 'LLaMA 3.3 70B' },
      { id: 'Qwen/QwQ-32B', name: 'Qwen QwQ 32B' },
    ],
    supportsCustomModel: true,
  },
  gemini: {
    displayName: 'Google Gemini',
    models: [
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
      { id: 'gemini-2.5-flash-preview-05-20', name: 'Gemini 2.5 Flash' },
      { id: 'gemini-2.5-pro-preview-05-06', name: 'Gemini 2.5 Pro' },
    ],
    supportsCustomModel: false,
  },
  claude: {
    displayName: 'Anthropic Claude',
    models: [
      { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4' },
      { id: 'claude-haiku-4-20250514', name: 'Claude Haiku 4' },
      { id: 'claude-opus-4-20250514', name: 'Claude Opus 4' },
    ],
    supportsCustomModel: false,
  },
};
