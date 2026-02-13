import { create } from 'zustand';
import type { MetricScore, ModelSelection, ScoreResult, TestResult, TestRun } from '../../../shared/types';

interface TestStore {
  // Current configuration
  selectedCategoryId: string | null;
  selectedScenarioId: string | null;
  selectedModels: ModelSelection[];
  parameterOverrides: Record<string, string | number>;
  mode: 'single' | 'comparison';

  // Results keyed by "provider/modelId"
  results: Record<string, TestResult>;
  scores: Record<string, ScoreResult>;
  isRunning: Record<string, boolean>;

  // History
  history: TestRun[];

  // Actions
  setCategory: (id: string) => void;
  setScenario: (id: string) => void;
  setMode: (mode: 'single' | 'comparison') => void;
  addModel: (model: ModelSelection) => void;
  removeModel: (key: string) => void;
  clearModels: () => void;
  setParameter: (key: string, value: string | number) => void;
  setResult: (modelKey: string, result: TestResult) => void;
  setScore: (modelKey: string, score: ScoreResult) => void;
  setRunning: (modelKey: string, running: boolean) => void;
  addHistoryEntry: (entry: TestRun) => void;
  clearResults: () => void;
  reset: () => void;
  loadHistory: () => void;
}

function modelKey(m: ModelSelection): string {
  return `${m.provider}/${m.modelId}`;
}

const HISTORY_KEY = 'llm-test-history';
const MAX_HISTORY = 100;

function loadHistoryFromStorage(): TestRun[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(history: TestRun[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
}

export const useTestStore = create<TestStore>((set, get) => ({
  selectedCategoryId: null,
  selectedScenarioId: null,
  selectedModels: [],
  parameterOverrides: {},
  mode: 'single',
  results: {},
  scores: {},
  isRunning: {},
  history: loadHistoryFromStorage(),

  setCategory: (id) => set({ selectedCategoryId: id, selectedScenarioId: null, results: {}, scores: {} }),
  setScenario: (id) => set({ selectedScenarioId: id, results: {}, scores: {} }),
  setMode: (mode) => set({ mode, results: {}, scores: {} }),

  addModel: (model) => set(state => {
    const key = modelKey(model);
    if (state.selectedModels.some(m => modelKey(m) === key)) return state;
    return { selectedModels: [...state.selectedModels, model] };
  }),

  removeModel: (key) => set(state => ({
    selectedModels: state.selectedModels.filter(m => modelKey(m) !== key),
  })),

  clearModels: () => set({ selectedModels: [] }),

  setParameter: (key, value) => set(state => ({
    parameterOverrides: { ...state.parameterOverrides, [key]: value },
  })),

  setResult: (modelKey, result) => set(state => ({
    results: { ...state.results, [modelKey]: result },
  })),

  setScore: (modelKey, score) => set(state => ({
    scores: { ...state.scores, [modelKey]: score },
  })),

  setRunning: (modelKey, running) => set(state => ({
    isRunning: { ...state.isRunning, [modelKey]: running },
  })),

  addHistoryEntry: (entry) => set(state => {
    const history = [entry, ...state.history].slice(0, MAX_HISTORY);
    saveHistory(history);
    return { history };
  }),

  clearResults: () => set({ results: {}, scores: {}, isRunning: {} }),

  reset: () => set({
    selectedCategoryId: null,
    selectedScenarioId: null,
    selectedModels: [],
    parameterOverrides: {},
    results: {},
    scores: {},
    isRunning: {},
  }),

  loadHistory: () => set({ history: loadHistoryFromStorage() }),
}));

export { modelKey };
