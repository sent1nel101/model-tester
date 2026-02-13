// ============================================================
// Provider & Model Types
// ============================================================

export type ProviderName = 'blackbox' | 'gemini' | 'claude';

export interface ModelInfo {
  id: string;
  name: string;
  provider: ProviderName;
}

export interface ModelSelection {
  provider: ProviderName;
  modelId: string;
  displayName: string;
}

// ============================================================
// Chat Request/Response Types
// ============================================================

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  provider: ProviderName;
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
}

export interface ChatResponse {
  content: string;
  model: string;
  provider: ProviderName;
  usage: { inputTokens: number; outputTokens: number };
  latencyMs: number;
  finishReason: string;
}

export interface StreamChunk {
  type: 'text' | 'usage' | 'done' | 'error';
  text?: string;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs?: number;
  error?: string;
}

// ============================================================
// Test Scenario Types
// ============================================================

export interface ConfigurableVar {
  key: string;
  label: string;
  type: 'number' | 'string' | 'select' | 'textarea';
  default: number | string;
  min?: number;
  max?: number;
  step?: number;
  options?: { label: string; value: string }[];
  description: string;
}

export interface ScoringMetric {
  id: string;
  name: string;
  weight: number;
  description: string;
  scoringMethod: 'algorithmic' | 'llm-judge' | 'hybrid';
  algorithmicCheck?: string;
  llmJudgePrompt?: string;
  scale: { min: number; max: number };
}

export interface ScoringRubric {
  metrics: ScoringMetric[];
  maxScore: number;
}

export interface TestScenario {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  prompt: string;
  systemPrompt?: string;
  expectedBehavior: string;
  referenceAnswer?: string;
  configurableVars: ConfigurableVar[];
  scoringRubric: ScoringRubric;
  tags: string[];
}

export interface TestCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  scenarios: TestScenario[];
}

// ============================================================
// Test Result Types
// ============================================================

export interface TestResult {
  content: string;
  latencyMs: number;
  usage: { inputTokens: number; outputTokens: number };
  finishReason: string;
  timestamp: string;
}

export interface MetricScore {
  metricId: string;
  name: string;
  score: number;
  maxScore: number;
  weight: number;
  reasoning: string;
  method: 'algorithmic' | 'llm-judge';
}

export interface ScoreResult {
  metricScores: MetricScore[];
  totalScore: number;
  maxPossible: number;
  percentage: number;
}

export interface TestRun {
  id: string;
  scenarioId: string;
  scenarioName: string;
  categoryId: string;
  model: ModelSelection;
  prompt: string;
  parameters: Record<string, number | string>;
  result: TestResult;
  score?: ScoreResult;
  timestamp: string;
}

// ============================================================
// API Request/Response for Scoring
// ============================================================

export interface ScoreRequest {
  originalPrompt: string;
  modelResponse: string;
  referenceAnswer?: string;
  rubricMetrics: ScoringMetric[];
  judgeProvider?: ProviderName;
  judgeModel?: string;
}

export interface ScoreResponse {
  scores: {
    metricId: string;
    score: number;
    maxScore: number;
    reasoning: string;
  }[];
  judgeModel: string;
  latencyMs: number;
}

// ============================================================
// Health Check
// ============================================================

export interface HealthStatus {
  providers: {
    name: ProviderName;
    configured: boolean;
    displayName: string;
  }[];
}
