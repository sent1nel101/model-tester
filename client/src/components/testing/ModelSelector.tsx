import { useEffect, useState } from 'react';
import type { ModelInfo, ModelSelection, ProviderName } from '../../../../shared/types';
import { api } from '../../services/api';

interface Props {
  selected: ModelSelection[];
  onAdd: (model: ModelSelection) => void;
  onRemove: (key: string) => void;
  multi?: boolean;
}

const PROVIDER_META: Record<ProviderName, { displayName: string; supportsCustomModel: boolean }> = {
  blackbox: { displayName: 'Blackbox AI', supportsCustomModel: true },
  gemini: { displayName: 'Google Gemini', supportsCustomModel: false },
  claude: { displayName: 'Anthropic Claude', supportsCustomModel: false },
};

export function ModelSelector({ selected, onAdd, onRemove, multi = false }: Props) {
  const [provider, setProvider] = useState<ProviderName>('blackbox');
  const [modelId, setModelId] = useState('');
  const [customModel, setCustomModel] = useState('');
  const [availableModels, setAvailableModels] = useState<Record<string, ModelInfo[]>>({});
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setFetchError(null);
    api.getModels()
      .then(models => {
        setAvailableModels(models);
        setLoading(false);
      })
      .catch(err => {
        setFetchError(err.message);
        setLoading(false);
      });
  }, []);

  const refreshModels = () => {
    setLoading(true);
    setFetchError(null);
    api.getModels()
      .then(models => {
        setAvailableModels(models);
        setLoading(false);
      })
      .catch(err => {
        setFetchError(err.message);
        setLoading(false);
      });
  };

  const meta = PROVIDER_META[provider] || { displayName: provider, supportsCustomModel: false };
  const models = availableModels[provider] || [];
  const availableProviders = Object.keys(PROVIDER_META) as ProviderName[];

  const handleAdd = () => {
    const id = modelId || (meta.supportsCustomModel ? customModel : '');
    if (!id) return;

    const displayName = models.find(m => m.id === id)?.name || id;
    const model: ModelSelection = {
      provider,
      modelId: id,
      displayName: `${meta.displayName} - ${displayName}`,
    };

    if (!multi) {
      selected.forEach(m => onRemove(`${m.provider}/${m.modelId}`));
    }
    onAdd(model);
    setModelId('');
    setCustomModel('');
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-400">
          {multi ? 'Models (select multiple)' : 'Model'}
        </label>
        <button
          onClick={refreshModels}
          disabled={loading}
          className="text-xs text-gray-500 hover:text-indigo-400 transition-colors disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Refresh models'}
        </button>
      </div>

      {fetchError && (
        <p className="text-xs text-red-400">Failed to load models: {fetchError}</p>
      )}

      <div className="flex flex-wrap gap-2">
        <select
          value={provider}
          onChange={e => { setProvider(e.target.value as ProviderName); setModelId(''); }}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
        >
          {availableProviders.map(key => (
            <option key={key} value={key}>{PROVIDER_META[key].displayName}</option>
          ))}
        </select>

        <select
          value={modelId}
          onChange={e => setModelId(e.target.value)}
          className="min-w-0 flex-1 basis-40 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
        >
          <option value="">
            {loading ? 'Loading models...' : models.length === 0 ? 'No models available' : 'Select a model...'}
          </option>
          {models.map(m => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>

        <button
          onClick={handleAdd}
          disabled={!modelId && !customModel}
          className="shrink-0 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {multi ? 'Add' : 'Select'}
        </button>
      </div>

      {meta.supportsCustomModel && (
        <div className="flex gap-2">
          <input
            type="text"
            value={customModel}
            onChange={e => { setCustomModel(e.target.value); setModelId(''); }}
            placeholder="Or type a custom model ID..."
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>
      )}

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map(m => {
            const key = `${m.provider}/${m.modelId}`;
            return (
              <span
                key={key}
                className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-600/20 border border-indigo-500/30 rounded-full text-xs text-indigo-300"
              >
                {m.displayName}
                <button
                  onClick={() => onRemove(key)}
                  className="ml-1 text-indigo-400 hover:text-white"
                >
                  &times;
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
