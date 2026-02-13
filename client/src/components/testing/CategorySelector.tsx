import { TEST_CATEGORIES } from '../../data/testCatalog';

interface Props {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const ICON_MAP: Record<string, string> = {
  layers: '\u25A6',
  search: '\u2315',
  pen: '\u270E',
  brain: '\u2699',
  'list-checks': '\u2611',
  messages: '\u2709',
};

export function CategorySelector({ selectedId, onSelect }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {TEST_CATEGORIES.map(cat => (
        <button
          key={cat.id}
          onClick={() => onSelect(cat.id)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            selectedId === cat.id
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
          }`}
        >
          <span className="mr-2">{ICON_MAP[cat.icon] || '\u25CB'}</span>
          {cat.name}
        </button>
      ))}
    </div>
  );
}
