import { useCallback, useState } from 'react';
import type { ChatMessage, MetricScore, TestScenario } from '../../../shared/types';
import { CategorySelector } from '../components/testing/CategorySelector';
import { ModelSelector } from '../components/testing/ModelSelector';
import { ParameterControls } from '../components/testing/ParameterControls';
import { PromptEditor } from '../components/testing/PromptEditor';
import { ScenarioSelector } from '../components/testing/ScenarioSelector';
import { ResponseMetadata } from '../components/results/ResponseMetadata';
import { StreamingOutput } from '../components/results/StreamingOutput';
import { ScoreCard } from '../components/scoring/ScoreCard';
import { getScenarioById } from '../data/testCatalog';
import { useStream } from '../hooks/useStream';
import { api } from '../services/api';
import { useTestStore, modelKey } from '../store/testStore';
import { resolvePrompt, runAlgorithmicScoring, calculateTotalScore } from '../utils/scoring';

export function SingleTestPage() {
  const store = useTestStore();
  const stream = useStream();
  const [metricScores, setMetricScores] = useState<MetricScore[]>([]);
  const [totalPercentage, setTotalPercentage] = useState(0);
  const [isScoring, setIsScoring] = useState(false);

  const scenarioData = store.selectedScenarioId ? getScenarioById(store.selectedScenarioId) : null;
  const scenario = scenarioData?.scenario;
  const model = store.selectedModels[0];

  const getVarValues = useCallback((): Record<string, string | number> => {
    if (!scenario) return {};
    const vals: Record<string, string | number> = {};
    for (const v of scenario.configurableVars) {
      vals[v.key] = store.parameterOverrides[v.key] ?? v.default;
    }
    return vals;
  }, [scenario, store.parameterOverrides]);

  const handleRun = useCallback(async () => {
    if (!scenario || !model) return;

    setMetricScores([]);
    setTotalPercentage(0);
    setIsScoring(false);

    const vars = getVarValues();
    const resolvedPrompt = resolvePrompt(scenario.prompt, vars);
    const resolvedSystem = scenario.systemPrompt ? resolvePrompt(scenario.systemPrompt, vars) : undefined;

    const messages: ChatMessage[] = [];
    if (resolvedSystem) {
      messages.push({ role: 'system', content: resolvedSystem });
    }
    messages.push({ role: 'user', content: resolvedPrompt });

    const responseText = await stream.startStream({
      provider: model.provider,
      model: model.modelId,
      messages,
      temperature: Number(vars.temperature) ?? 0.7,
      maxTokens: Number(vars.maxTokens) ?? 1024,
    });

    // Run scoring
    if (responseText && scenario) {
      // Algorithmic scoring (instant)
      const algoScores = runAlgorithmicScoring(responseText, scenario, vars);
      setMetricScores(algoScores);

      // LLM judge scoring (async)
      const llmMetrics = scenario.scoringRubric.metrics.filter(
        m => m.scoringMethod === 'llm-judge' || m.scoringMethod === 'hybrid'
      );

      if (llmMetrics.length > 0) {
        setIsScoring(true);
        try {
          const scoreResponse = await api.score({
            originalPrompt: resolvedPrompt,
            modelResponse: responseText,
            referenceAnswer: scenario.referenceAnswer,
            rubricMetrics: llmMetrics,
          });

          const llmScores: MetricScore[] = scoreResponse.scores.map(s => {
            const metric = llmMetrics.find(m => m.id === s.metricId)!;
            return {
              metricId: s.metricId,
              name: metric.name,
              score: s.score,
              maxScore: s.maxScore,
              weight: metric.weight,
              reasoning: s.reasoning,
              method: 'llm-judge' as const,
            };
          });

          const combined = [...algoScores, ...llmScores];
          const totals = calculateTotalScore(algoScores, llmScores);
          setMetricScores(combined);
          setTotalPercentage(totals.percentage);

          // Save to history
          store.addHistoryEntry({
            id: crypto.randomUUID(),
            scenarioId: scenario.id,
            scenarioName: scenario.name,
            categoryId: scenario.categoryId,
            model,
            prompt: resolvedPrompt,
            parameters: vars,
            result: {
              content: responseText,
              latencyMs: stream.latencyMs,
              usage: stream.usage,
              finishReason: 'stop',
              timestamp: new Date().toISOString(),
            },
            score: {
              metricScores: combined,
              ...totals,
            },
            timestamp: new Date().toISOString(),
          });
        } catch (err) {
          console.error('Scoring error:', err);
        } finally {
          setIsScoring(false);
        }
      } else {
        // Only algorithmic scores
        const totals = calculateTotalScore(algoScores, []);
        setTotalPercentage(totals.percentage);
      }
    }
  }, [scenario, model, getVarValues, stream, store]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Single Model Test</h1>
      </div>

      {/* Category selector */}
      <CategorySelector
        selectedId={store.selectedCategoryId}
        onSelect={store.setCategory}
      />

      {store.selectedCategoryId && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left panel: Configuration */}
          <div className="lg:col-span-2 space-y-4">
            <ScenarioSelector
              categoryId={store.selectedCategoryId}
              selectedId={store.selectedScenarioId}
              onSelect={store.setScenario}
            />

            {scenario && (
              <>
                <ModelSelector
                  selected={store.selectedModels}
                  onAdd={store.addModel}
                  onRemove={store.removeModel}
                />

                <ParameterControls
                  vars={scenario.configurableVars}
                  values={store.parameterOverrides}
                  onChange={store.setParameter}
                />

                <PromptEditor
                  prompt={scenario.prompt}
                  systemPrompt={scenario.systemPrompt}
                  vars={scenario.configurableVars}
                  values={store.parameterOverrides}
                  onChange={store.setParameter}
                />

                <button
                  onClick={handleRun}
                  disabled={!model || stream.status === 'streaming'}
                  className="w-full py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {stream.status === 'streaming' ? 'Running...' : 'Run Test'}
                </button>
              </>
            )}
          </div>

          {/* Right panel: Results */}
          <div className="lg:col-span-3 space-y-4">
            <StreamingOutput
              text={stream.fullText}
              status={stream.status}
              error={stream.error}
              usedFallback={stream.usedFallback}
              onRetry={handleRun}
              onCancel={stream.cancel}
            />

            <ResponseMetadata
              latencyMs={stream.latencyMs}
              usage={stream.usage}
              status={stream.status}
            />

            <ScoreCard
              metricScores={metricScores}
              totalPercentage={totalPercentage}
              isLoading={isScoring}
            />
          </div>
        </div>
      )}
    </div>
  );
}
