import { useState } from 'react';
import type { TestRun } from '../../../shared/types';
import { useTestStore } from '../store/testStore';

export function HistoryPage() {
  const history = useTestStore(s => s.history);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState('');

  const filtered = filter
    ? history.filter(r =>
        r.scenarioName.toLowerCase().includes(filter.toLowerCase()) ||
        r.model.displayName.toLowerCase().includes(filter.toLowerCase()) ||
        r.categoryId.toLowerCase().includes(filter.toLowerCase())
      )
    : history;

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(history, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `llm-test-history-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Test History</h1>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Filter..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
          />
          <button
            onClick={handleExport}
            disabled={history.length === 0}
            className="px-4 py-2 bg-gray-800 text-gray-300 border border-gray-700 rounded-lg hover:border-gray-600 text-sm disabled:opacity-50"
          >
            Export JSON
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          {history.length === 0
            ? 'No test history yet. Run some tests to see them here.'
            : 'No results match your filter.'}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(run => (
            <div key={run.id} className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
              <button
                onClick={() => setExpanded(expanded === run.id ? null : run.id)}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-750 transition-colors text-left"
              >
                <div className="flex items-center gap-4">
                  <div>
                    <div className="text-sm font-medium text-white">{run.scenarioName}</div>
                    <div className="text-xs text-gray-500">
                      {run.model.displayName} &middot; {run.categoryId} &middot; {new Date(run.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {run.score && (
                    <span className={`text-lg font-bold ${
                      run.score.percentage >= 80 ? 'text-green-400' :
                      run.score.percentage >= 60 ? 'text-yellow-400' :
                      'text-red-400'
                    }`}>
                      {run.score.percentage}%
                    </span>
                  )}
                  <span className="text-gray-500 text-xs">{expanded === run.id ? '\u25B2' : '\u25BC'}</span>
                </div>
              </button>

              {expanded === run.id && (
                <div className="border-t border-gray-700 p-4 space-y-4">
                  {/* Prompt */}
                  <div>
                    <label className="text-xs text-gray-500 font-medium">Prompt</label>
                    <pre className="mt-1 bg-gray-900 rounded-lg p-3 text-xs text-gray-300 whitespace-pre-wrap max-h-32 overflow-y-auto">
                      {run.prompt}
                    </pre>
                  </div>

                  {/* Response */}
                  <div>
                    <label className="text-xs text-gray-500 font-medium">Response</label>
                    <pre className="mt-1 bg-gray-900 rounded-lg p-3 text-xs text-gray-300 whitespace-pre-wrap max-h-48 overflow-y-auto">
                      {run.result.content}
                    </pre>
                  </div>

                  {/* Metadata */}
                  <div className="flex gap-4 text-xs text-gray-400">
                    <span>Latency: {(run.result.latencyMs / 1000).toFixed(2)}s</span>
                    <span>Input: {run.result.usage.inputTokens} tokens</span>
                    <span>Output: {run.result.usage.outputTokens} tokens</span>
                  </div>

                  {/* Scores */}
                  {run.score && (
                    <div className="space-y-2">
                      <label className="text-xs text-gray-500 font-medium">Score Breakdown</label>
                      {run.score.metricScores.map(m => (
                        <div key={m.metricId} className="flex items-center justify-between text-xs">
                          <span className="text-gray-400">
                            {m.name} <span className="text-gray-600">[{m.method}]</span>
                          </span>
                          <span className={`font-mono ${
                            (m.score / m.maxScore) >= 0.8 ? 'text-green-400' :
                            (m.score / m.maxScore) >= 0.6 ? 'text-yellow-400' :
                            'text-red-400'
                          }`}>
                            {m.score}/{m.maxScore}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
