import { useState } from 'react';
import type { ModelSelection, ProviderName } from '../../../../shared/types';
import { MODEL_REGISTRY } from '../../data/modelRegistry';

interface Props {
  selected: ModelSelection[];
  onAdd: (model: ModelSelection) => void;
  onRemove: (key: string) => void;
  multi?: boolean;
}

export function ModelSelector({ selected, onAdd, onRemove, multi = false }: Props) {
  const [provider, setProvider] = useState<ProviderName>('blackbox');
  const [modelId, setModelId] = useState('');
  const [customModel, setCustomModel] = useState('');

  const registry = MODEL_REGISTRY[provider];
  const models = registry.models;

  const handleAdd = () => {
    const id = modelId || (registry.supportsCustomModel ? customModel : '');
    if (!id) return;

    const displayName = models.find(m => m.id === id)?.name || id;
    const model: ModelSelection = {
      provider,
      modelId: id,
      displayName: `${registry.displayName} - ${displayName}`,
    };

    if (!multi) {
      // In single mode, replace the existing model
      selected.forEach(m => onRemove(`${m.provider}/${m.modelId}`));
    }
    onAdd(model);
    setModelId('');
    setCustomModel('');
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-400">
        {multi ? 'Models (select multiple)' : 'Model'}
      </label>

      <div className="flex gap-2">
        <select
          value={provider}
          onChange={e => { setProvider(e.target.value as ProviderName); setModelId(''); }}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
        >
          {Object.entries(MODEL_REGISTRY).map(([key, val]) => (
            <option key={key} value={key}>{val.displayName}</option>
          ))}
        </select>

        <select
          value={modelId}
          onChange={e => setModelId(e.target.value)}
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
        >
          <option value="">Select a model...</option>
          {models.map(m => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>

        <button
          onClick={handleAdd}
          disabled={!modelId && !customModel}
          className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {multi ? 'Add' : 'Select'}
        </button>
      </div>

      {registry.supportsCustomModel && (
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
