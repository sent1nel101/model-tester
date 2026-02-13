import type { MetricScore } from '../../../../shared/types';

interface Props {
  metricScores: MetricScore[];
  totalPercentage: number;
  isLoading?: boolean;
}

function getScoreColor(pct: number): string {
  if (pct >= 80) return 'text-green-400';
  if (pct >= 60) return 'text-yellow-400';
  if (pct >= 40) return 'text-orange-400';
  return 'text-red-400';
}

function getBarColor(pct: number): string {
  if (pct >= 80) return 'bg-green-500';
  if (pct >= 60) return 'bg-yellow-500';
  if (pct >= 40) return 'bg-orange-500';
  return 'bg-red-500';
}

export function ScoreCard({ metricScores, totalPercentage, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <span className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          Scoring with LLM judge...
        </div>
      </div>
    );
  }

  if (metricScores.length === 0) return null;

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-4">
      {/* Overall score */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-400">Overall Score</span>
        <span className={`text-2xl font-bold ${getScoreColor(totalPercentage)}`}>
          {totalPercentage}%
        </span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${getBarColor(totalPercentage)}`}
          style={{ width: `${totalPercentage}%` }}
        />
      </div>

      {/* Per-metric breakdown */}
      <div className="space-y-3 pt-2">
        {metricScores.map(m => {
          const pct = (m.score / Math.max(m.maxScore, 1)) * 100;
          return (
            <div key={m.metricId} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">
                  {m.name}
                  <span className="ml-1 text-gray-600">({m.weight}%)</span>
                  <span className="ml-1 text-gray-600">[{m.method}]</span>
                </span>
                <span className={`font-mono ${getScoreColor(pct)}`}>
                  {m.score}/{m.maxScore}
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full ${getBarColor(pct)}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              {m.reasoning && (
                <p className="text-[10px] text-gray-500 italic">{m.reasoning}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
