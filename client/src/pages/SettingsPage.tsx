import { useEffect, useState } from 'react';
import type { HealthStatus } from '../../../shared/types';
import { api } from '../services/api';

export function SettingsPage() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getHealth()
      .then(setHealth)
      .catch(err => setError(err.message));
  }, []);

  const handleClearHistory = () => {
    if (confirm('Clear all test history? This cannot be undone.')) {
      localStorage.removeItem('llm-test-history');
      window.location.reload();
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-8">
      <h1 className="text-2xl font-bold text-white">Settings</h1>

      {/* Server connection */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">Server Connection</h2>
        {error ? (
          <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 text-sm text-red-400">
            Cannot reach server at localhost:3001. Make sure to run <code className="bg-gray-800 px-1 rounded">npm run dev</code> from the project root.
          </div>
        ) : (
          <div className="bg-green-900/10 border border-green-800 rounded-lg p-4 text-sm text-green-400">
            Connected to server
          </div>
        )}
      </section>

      {/* API keys */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">API Keys</h2>
        <p className="text-sm text-gray-400">
          API keys are stored in <code className="bg-gray-800 px-1 rounded text-gray-300">server/.env</code> and never exposed to the browser.
        </p>
        <div className="space-y-2">
          {health?.providers.map(p => (
            <div key={p.name} className="flex items-center justify-between bg-gray-800 border border-gray-700 rounded-lg p-3">
              <span className="text-sm text-white">{p.displayName}</span>
              <span className={`text-xs font-medium px-2 py-1 rounded ${
                p.configured
                  ? 'bg-green-900/30 text-green-400'
                  : 'bg-red-900/30 text-red-400'
              }`}>
                {p.configured ? 'Configured' : 'Missing'}
              </span>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500">
          To add or change an API key, edit <code className="bg-gray-800 px-1 rounded">server/.env</code> and restart the server.
        </p>
      </section>

      {/* Data management */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">Data Management</h2>
        <div className="flex gap-3">
          <button
            onClick={handleClearHistory}
            className="px-4 py-2 bg-red-900/20 text-red-400 border border-red-800 rounded-lg hover:bg-red-900/30 text-sm"
          >
            Clear Test History
          </button>
        </div>
        <p className="text-xs text-gray-500">
          Test history is stored in your browser's localStorage. Clearing it cannot be undone.
        </p>
      </section>
    </div>
  );
}
