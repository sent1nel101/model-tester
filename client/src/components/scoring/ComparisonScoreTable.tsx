import type { MetricScore, ModelSelection, ScoreResult } from '../../../../shared/types';

interface Props {
  models: ModelSelection[];
  scores: Record<string, ScoreResult>;
}

export function ComparisonScoreTable({ models, scores }: Props) {
  if (models.length === 0 || Object.keys(scores).length === 0) return null;

  // Collect all metric IDs from the first available score
  const firstScore = Object.values(scores)[0];
  if (!firstScore) return null;

  const metrics = firstScore.metricScores;

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-900">
            <th className="text-left px-4 py-3 text-gray-400 font-medium">Metric</th>
            {models.map(m => {
              const key = `${m.provider}/${m.modelId}`;
              return (
                <th key={key} className="text-center px-4 py-3 text-gray-400 font-medium">
                  {m.displayName}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {metrics.map(metric => {
            // Find the best score for this metric across models
            const modelScores = models.map(m => {
              const key = `${m.provider}/${m.modelId}`;
              const result = scores[key];
              const ms = result?.metricScores.find(s => s.metricId === metric.metricId);
              return { key, score: ms?.score ?? 0, maxScore: ms?.maxScore ?? metric.maxScore };
            });
            const bestScore = Math.max(...modelScores.map(s => s.score));

            return (
              <tr key={metric.metricId} className="border-t border-gray-700">
                <td className="px-4 py-2 text-gray-300">
                  {metric.name}
                  <span className="ml-1 text-gray-600 text-xs">({metric.weight}%)</span>
                </td>
                {modelScores.map(ms => {
                  const pct = (ms.score / Math.max(ms.maxScore, 1)) * 100;
                  const isBest = ms.score === bestScore && modelScores.filter(s => s.score === bestScore).length === 1;
                  return (
                    <td key={ms.key} className="text-center px-4 py-2">
                      <span className={`font-mono ${
                        isBest ? 'text-green-400 font-bold' :
                        pct >= 60 ? 'text-gray-200' : 'text-red-400'
                      }`}>
                        {ms.score}/{ms.maxScore}
                      </span>
                    </td>
                  );
                })}
              </tr>
            );
          })}
          {/* Total row */}
          <tr className="border-t-2 border-gray-600 bg-gray-900/50">
            <td className="px-4 py-3 text-white font-medium">Total</td>
            {models.map(m => {
              const key = `${m.provider}/${m.modelId}`;
              const result = scores[key];
              const pct = result?.percentage ?? 0;
              const allPcts = models.map(m2 => scores[`${m2.provider}/${m2.modelId}`]?.percentage ?? 0);
              const isBest = pct === Math.max(...allPcts) && allPcts.filter(p => p === pct).length === 1;
              return (
                <td key={key} className="text-center px-4 py-3">
                  <span className={`text-lg font-bold ${
                    isBest ? 'text-green-400' :
                    pct >= 60 ? 'text-white' : 'text-red-400'
                  }`}>
                    {pct}%
                  </span>
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
