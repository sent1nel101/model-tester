import type { ConfigurableVar } from '../../../../shared/types';

interface Props {
  prompt: string;
  systemPrompt?: string;
  vars: ConfigurableVar[];
  values: Record<string, string | number>;
  onChange: (key: string, value: string | number) => void;
}

export function PromptEditor({ prompt, systemPrompt, vars, values, onChange }: Props) {
  // Show scenario-specific vars (not temperature/maxTokens)
  const scenarioVars = vars.filter(v => v.key !== 'temperature' && v.key !== 'maxTokens');

  // Build the resolved prompt for display
  let resolved = prompt;
  for (const v of vars) {
    const val = values[v.key] ?? v.default;
    resolved = resolved.replace(new RegExp(`\\{\\{${v.key}\\}\\}`, 'g'), String(val));
  }

  let resolvedSystem = systemPrompt || '';
  for (const v of vars) {
    const val = values[v.key] ?? v.default;
    resolvedSystem = resolvedSystem.replace(new RegExp(`\\{\\{${v.key}\\}\\}`, 'g'), String(val));
  }

  return (
    <div className="space-y-4">
      {/* Scenario-specific variables */}
      {scenarioVars.length > 0 && (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-400">Scenario Variables</label>
          {scenarioVars.map(v => (
            <div key={v.key} className="space-y-1">
              <label className="text-xs text-gray-400">{v.label}</label>
              {v.type === 'textarea' ? (
                <textarea
                  value={String(values[v.key] ?? v.default)}
                  onChange={e => onChange(v.key, e.target.value)}
                  rows={4}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none resize-y"
                />
              ) : v.type === 'select' ? (
                <select
                  value={String(values[v.key] ?? v.default)}
                  onChange={e => onChange(v.key, e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                >
                  {v.options?.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              ) : v.type === 'number' ? (
                <input
                  type="number"
                  value={Number(values[v.key] ?? v.default)}
                  onChange={e => onChange(v.key, parseFloat(e.target.value) || 0)}
                  min={v.min}
                  max={v.max}
                  step={v.step}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                />
              ) : (
                <input
                  type="text"
                  value={String(values[v.key] ?? v.default)}
                  onChange={e => onChange(v.key, e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
                />
              )}
              <p className="text-[10px] text-gray-500">{v.description}</p>
            </div>
          ))}
        </div>
      )}

      {/* Resolved prompt preview */}
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-400">Prompt Preview</label>
        {resolvedSystem && (
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 text-xs text-gray-400 mb-2">
            <span className="text-indigo-400 font-medium">System:</span> {resolvedSystem}
          </div>
        )}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-sm text-gray-300 whitespace-pre-wrap max-h-48 overflow-y-auto">
          {resolved}
        </div>
      </div>
    </div>
  );
}
