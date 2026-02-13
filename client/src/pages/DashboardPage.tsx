import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { HealthStatus } from '../../../shared/types';
import { TEST_CATEGORIES } from '../data/testCatalog';
import { api } from '../services/api';
import { useTestStore } from '../store/testStore';

export function DashboardPage() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const history = useTestStore(s => s.history);

  useEffect(() => {
    api.getHealth()
      .then(setHealth)
      .catch(err => setError(err.message));
  }, []);

  const recentHistory = history.slice(0, 5);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">LLM Test Bench</h1>
        <p className="text-gray-400 mt-2">Test and compare LLM capabilities across providers</p>
      </div>

      {/* Provider status */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-white">Provider Status</h2>
        {error && (
          <div className="bg-red-900/20 border border-red-800 rounded-lg p-3 text-sm text-red-400">
            Cannot connect to server: {error}. Make sure the server is running on port 3001.
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {health?.providers.map(p => (
            <div key={p.name} className={`rounded-lg p-4 border ${
              p.configured
                ? 'bg-green-900/10 border-green-800'
                : 'bg-gray-800 border-gray-700'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${p.configured ? 'bg-green-500' : 'bg-gray-600'}`} />
                <div>
                  <div className="text-sm font-medium text-white">{p.displayName}</div>
                  <div className={`text-xs ${p.configured ? 'text-green-400' : 'text-gray-500'}`}>
                    {p.configured ? 'API Key Configured' : 'Not Configured'}
                  </div>
                </div>
              </div>
            </div>
          )) || (
            !error && <div className="text-sm text-gray-500">Loading...</div>
          )}
        </div>
      </div>

      {/* Quick start */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-white">Test Categories</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {TEST_CATEGORIES.map(cat => (
            <Link
              key={cat.id}
              to={`/test?category=${cat.id}`}
              className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-indigo-500 transition-colors group"
            >
              <div className="text-lg font-medium text-white group-hover:text-indigo-400 transition-colors">
                {cat.name}
              </div>
              <p className="text-sm text-gray-400 mt-1">{cat.description}</p>
              <div className="text-xs text-gray-500 mt-2">
                {cat.scenarios.length} test scenario{cat.scenarios.length !== 1 ? 's' : ''}
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex gap-4">
        <Link
          to="/test"
          className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors font-medium"
        >
          Single Model Test
        </Link>
        <Link
          to="/compare"
          className="px-6 py-3 bg-gray-800 text-white border border-gray-700 rounded-lg hover:border-indigo-500 transition-colors font-medium"
        >
          Compare Models
        </Link>
      </div>

      {/* Recent history */}
      {recentHistory.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Recent Tests</h2>
            <Link to="/history" className="text-sm text-indigo-400 hover:text-indigo-300">View all</Link>
          </div>
          <div className="space-y-2">
            {recentHistory.map(run => (
              <div key={run.id} className="bg-gray-800 border border-gray-700 rounded-lg p-3 flex items-center justify-between">
                <div>
                  <div className="text-sm text-white">{run.scenarioName}</div>
                  <div className="text-xs text-gray-500">
                    {run.model.displayName} &middot; {new Date(run.timestamp).toLocaleString()}
                  </div>
                </div>
                {run.score && (
                  <span className={`text-lg font-bold ${
                    run.score.percentage >= 80 ? 'text-green-400' :
                    run.score.percentage >= 60 ? 'text-yellow-400' :
                    'text-red-400'
                  }`}>
                    {run.score.percentage}%
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
