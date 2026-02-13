import { useCallback, useRef, useState } from 'react';
import type { ChatMessage, MetricScore, ModelSelection, ScoreResult } from '../../../shared/types';
import { CategorySelector } from '../components/testing/CategorySelector';
import { ModelSelector } from '../components/testing/ModelSelector';
import { ParameterControls } from '../components/testing/ParameterControls';
import { PromptEditor } from '../components/testing/PromptEditor';
import { ScenarioSelector } from '../components/testing/ScenarioSelector';
import { ResponseMetadata } from '../components/results/ResponseMetadata';
import { StreamingOutput } from '../components/results/StreamingOutput';
import { ScoreCard } from '../components/scoring/ScoreCard';
import { ComparisonScoreTable } from '../components/scoring/ComparisonScoreTable';
import { getScenarioById } from '../data/testCatalog';
import { api } from '../services/api';
import { useTestStore } from '../store/testStore';
import { resolvePrompt, runAlgorithmicScoring, calculateTotalScore } from '../utils/scoring';
import type { StreamStatus } from '../hooks/useStream';

const CLIENT_TIMEOUT = 95_000;

interface ModelStreamState {
  text: string;
  status: StreamStatus;
  error: string | null;
  latencyMs: number;
  usage: { inputTokens: number; outputTokens: number };
  metricScores: MetricScore[];
  totalPercentage: number;
  isScoring: boolean;
  usedFallback: boolean;
}

export function ComparisonPage() {
  const store = useTestStore();
  const [modelStates, setModelStates] = useState<Record<string, ModelStreamState>>({});
  const [scores, setScores] = useState<Record<string, ScoreResult>>({});
  const abortRefs = useRef<Record<string, AbortController>>({});

  const scenarioData = store.selectedScenarioId ? getScenarioById(store.selectedScenarioId) : null;
  const scenario = scenarioData?.scenario;

  const getVarValues = useCallback((): Record<string, string | number> => {
    if (!scenario) return {};
    const vals: Record<string, string | number> = {};
    for (const v of scenario.configurableVars) {
      vals[v.key] = store.parameterOverrides[v.key] ?? v.default;
    }
    return vals;
  }, [scenario, store.parameterOverrides]);

  const updateModelState = (key: string, update: Partial<ModelStreamState>) => {
    setModelStates(prev => ({
      ...prev,
      [key]: { ...prev[key], ...update },
    }));
  };

  const tryFallback = async (key: string, request: { provider: string; model: string; messages: ChatMessage[]; temperature: number; maxTokens: number }): Promise<string | null> => {
    try {
      updateModelState(key, { usedFallback: true, error: null });
      const result = await api.chat(request);
      updateModelState(key, {
        text: result.content,
        status: 'done',
        latencyMs: result.latencyMs,
        usage: result.usage,
      });
      return result.content;
    } catch {
      updateModelState(key, { usedFallback: false });
      return null;
    }
  };

  const cancelModel = (key: string) => {
    abortRefs.current[key]?.abort();
    updateModelState(key, { status: 'done' });
  };

  const runSingleModel = async (model: ModelSelection, prompt: string, systemPrompt: string | undefined, vars: Record<string, string | number>) => {
    const key = `${model.provider}/${model.modelId}`;
    const abort = new AbortController();
    abortRefs.current[key] = abort;

    updateModelState(key, {
      text: '', status: 'streaming', error: null,
      latencyMs: 0, usage: { inputTokens: 0, outputTokens: 0 },
      metricScores: [], totalPercentage: 0, isScoring: false, usedFallback: false,
    });

    const messages: ChatMessage[] = [];
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
    messages.push({ role: 'user', content: prompt });

    const chatRequest = {
      provider: model.provider,
      model: model.modelId,
      messages,
      temperature: Number(vars.temperature) ?? 0.7,
      maxTokens: Number(vars.maxTokens) ?? 1024,
    };

    let accumulated = '';
    const startTime = Date.now();

    // Client-side timeout
    const timeoutId = setTimeout(() => abort.abort(), CLIENT_TIMEOUT);

    try {
      const result = await api.streamDirect(
        chatRequest,
        (update) => {
          if (update.text !== undefined) {
            accumulated = update.text;
            updateModelState(key, { text: update.text });
          }
          if (update.usage) {
            updateModelState(key, { usage: update.usage });
          }
        },
        abort.signal,
      );

      clearTimeout(timeoutId);

      if (result.error) {
        if (!accumulated) {
          const fallback = await tryFallback(key, chatRequest);
          if (fallback) { accumulated = fallback; }
          else {
            updateModelState(key, { status: 'error', error: result.error });
            return;
          }
        } else {
          updateModelState(key, { status: 'error', error: result.error });
          return;
        }
      }

      accumulated = result.text || accumulated;
      const latency = result.latencyMs || Date.now() - startTime;
      updateModelState(key, { status: 'done', latencyMs: latency });

      // Score the result
      if (accumulated && scenario) {
        const algoScores = runAlgorithmicScoring(accumulated, scenario, vars);
        updateModelState(key, { metricScores: algoScores, isScoring: true });

        const llmMetrics = scenario.scoringRubric.metrics.filter(
          m => m.scoringMethod === 'llm-judge' || m.scoringMethod === 'hybrid'
        );

        if (llmMetrics.length > 0) {
          try {
            const scoreResponse = await api.score({
              originalPrompt: prompt,
              modelResponse: accumulated,
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
            updateModelState(key, { metricScores: combined, totalPercentage: totals.percentage, isScoring: false });
            setScores(prev => ({
              ...prev,
              [key]: { metricScores: combined, ...totals },
            }));
          } catch {
            updateModelState(key, { isScoring: false });
          }
        } else {
          const totals = calculateTotalScore(algoScores, []);
          updateModelState(key, { totalPercentage: totals.percentage, isScoring: false });
          setScores(prev => ({
            ...prev,
            [key]: { metricScores: algoScores, ...totals },
          }));
        }
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.error(`[stream] ${key}:`, err.name, err.message);
      if (err.name === 'AbortError') {
        if (!accumulated && Date.now() - startTime >= CLIENT_TIMEOUT - 1000) {
          const fallback = await tryFallback(key, chatRequest);
          if (fallback) { accumulated = fallback; } else {
            updateModelState(key, { status: 'error', error: 'Request timed out' });
            return;
          }
        } else {
          updateModelState(key, { status: 'done' });
          return;
        }
      } else {
        if (!accumulated) {
          const fallback = await tryFallback(key, chatRequest);
          if (fallback) { accumulated = fallback; } else {
            updateModelState(key, { status: 'error', error: err.message });
            return;
          }
        } else {
          updateModelState(key, { status: 'error', error: err.message });
          return;
        }
      }
    }
  };

  const getResolvedPrompts = useCallback(() => {
    if (!scenario) return null;
    const vars = getVarValues();
    return {
      vars,
      prompt: resolvePrompt(scenario.prompt, vars),
      system: scenario.systemPrompt ? resolvePrompt(scenario.systemPrompt, vars) : undefined,
    };
  }, [scenario, getVarValues]);

  const handleRunAll = useCallback(async () => {
    if (!scenario || store.selectedModels.length === 0) return;
    const resolved = getResolvedPrompts();
    if (!resolved) return;

    setModelStates({});
    setScores({});

    await Promise.allSettled(
      store.selectedModels.map(model => runSingleModel(model, resolved.prompt, resolved.system, resolved.vars))
    );
  }, [scenario, store.selectedModels, getResolvedPrompts]);

  const handleRetryModel = useCallback((model: ModelSelection) => {
    const resolved = getResolvedPrompts();
    if (!resolved) return;
    runSingleModel(model, resolved.prompt, resolved.system, resolved.vars);
  }, [getResolvedPrompts]);

  const isAnyRunning = Object.values(modelStates).some(s => s.status === 'streaming');

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold text-white">Side-by-Side Comparison</h1>

      <CategorySelector
        selectedId={store.selectedCategoryId}
        onSelect={store.setCategory}
      />

      {store.selectedCategoryId && (
        <>
          {/* Row 1: Scenario + Model selection side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ScenarioSelector
              categoryId={store.selectedCategoryId}
              selectedId={store.selectedScenarioId}
              onSelect={store.setScenario}
            />

            {scenario && (
              <ModelSelector
                selected={store.selectedModels}
                onAdd={store.addModel}
                onRemove={store.removeModel}
                multi
              />
            )}
          </div>

          {/* Row 2: Parameters (temperature / max tokens) */}
          {scenario && (
            <ParameterControls
              vars={scenario.configurableVars}
              values={store.parameterOverrides}
              onChange={store.setParameter}
            />
          )}

          {/* Row 3: Scenario variables (left) + Prompt preview (right), full width */}
          {scenario && (
            <PromptEditor
              prompt={scenario.prompt}
              systemPrompt={scenario.systemPrompt}
              vars={scenario.configurableVars}
              values={store.parameterOverrides}
              onChange={store.setParameter}
              wideLayout
            />
          )}

          {scenario && (
            <button
              type="button"
              onClick={handleRunAll}
              disabled={store.selectedModels.length === 0 || isAnyRunning}
              className="w-full py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isAnyRunning ? 'Running...' : `Run All (${store.selectedModels.length} models)`}
            </button>
          )}

          {/* Side-by-side results */}
          {Object.keys(modelStates).length > 0 && (
            <div className={`grid gap-4 ${
              store.selectedModels.length === 1 ? 'grid-cols-1' :
              store.selectedModels.length === 2 ? 'grid-cols-1 lg:grid-cols-2' :
              'grid-cols-1 lg:grid-cols-3'
            }`}>
              {store.selectedModels.map(model => {
                const key = `${model.provider}/${model.modelId}`;
                const state = modelStates[key];
                if (!state) return null;

                return (
                  <div key={key} className="bg-gray-850 border border-gray-700 rounded-lg p-4 space-y-3">
                    <h3 className="text-sm font-medium text-indigo-400">{model.displayName}</h3>
                    <StreamingOutput
                      text={state.text}
                      status={state.status}
                      error={state.error}
                      usedFallback={state.usedFallback}
                      onRetry={() => handleRetryModel(model)}
                      onCancel={() => cancelModel(key)}
                    />
                    <ResponseMetadata latencyMs={state.latencyMs} usage={state.usage} status={state.status} />
                    <ScoreCard metricScores={state.metricScores} totalPercentage={state.totalPercentage} isLoading={state.isScoring} />
                  </div>
                );
              })}
            </div>
          )}

          {/* Comparison score table */}
          {Object.keys(scores).length > 1 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-white">Score Comparison</h2>
              <ComparisonScoreTable models={store.selectedModels} scores={scores} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
