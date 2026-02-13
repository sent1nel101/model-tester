import type { TestScenario } from '../../../../shared/types';
import { getCategoryById } from '../../data/testCatalog';

interface Props {
  categoryId: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function ScenarioSelector({ categoryId, selectedId, onSelect }: Props) {
  const category = getCategoryById(categoryId);
  if (!category) return null;

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-400">Test Scenario</label>
      <div className="space-y-2">
        {category.scenarios.map(scenario => (
          <button
            key={scenario.id}
            onClick={() => onSelect(scenario.id)}
            className={`w-full text-left p-3 rounded-lg transition-all ${
              selectedId === scenario.id
                ? 'bg-indigo-600/20 border border-indigo-500 text-white'
                : 'bg-gray-800 border border-gray-700 text-gray-300 hover:border-gray-600'
            }`}
          >
            <div className="font-medium text-sm">{scenario.name}</div>
            <div className="text-xs text-gray-400 mt-1">{scenario.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
