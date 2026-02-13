import type { ConfigurableVar } from '../../../../shared/types';

interface Props {
  vars: ConfigurableVar[];
  values: Record<string, string | number>;
  onChange: (key: string, value: string | number) => void;
}

export function ParameterControls({ vars, values, onChange }: Props) {
  // Only show temperature and maxTokens here (scenario-specific vars go in PromptEditor)
  const paramVars = vars.filter(v => v.key === 'temperature' || v.key === 'maxTokens');

  if (paramVars.length === 0) return null;

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-400">Parameters</label>
      <div className="grid grid-cols-2 gap-4">
        {paramVars.map(v => {
          const value = values[v.key] ?? v.default;
          return (
            <div key={v.key} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">{v.label}</span>
                <span className="text-xs text-indigo-400 font-mono">{value}</span>
              </div>
              {v.type === 'number' && (
                <input
                  type="range"
                  min={v.min}
                  max={v.max}
                  step={v.step}
                  value={Number(value)}
                  onChange={e => onChange(v.key, parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              )}
              <p className="text-[10px] text-gray-500">{v.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
