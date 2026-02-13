import type { MetricScore, ScoringMetric, TestScenario } from '../../../shared/types';

// Resolve template variables in a prompt string
export function resolvePrompt(template: string, vars: Record<string, string | number>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value));
  }
  return result;
}

// Run all algorithmic scoring checks for a scenario
export function runAlgorithmicScoring(
  response: string,
  scenario: TestScenario,
  vars: Record<string, string | number>
): MetricScore[] {
  const scores: MetricScore[] = [];

  for (const metric of scenario.scoringRubric.metrics) {
    if (metric.scoringMethod === 'llm-judge') continue;

    const score = runCheck(metric, response, vars);
    scores.push({
      metricId: metric.id,
      name: metric.name,
      score: score.score,
      maxScore: metric.scale.max,
      weight: metric.weight,
      reasoning: score.reasoning,
      method: 'algorithmic',
    });
  }

  return scores;
}

function runCheck(
  metric: ScoringMetric,
  response: string,
  vars: Record<string, string | number>
): { score: number; reasoning: string } {
  const check = metric.algorithmicCheck || '';
  const max = metric.scale.max;

  switch (check) {
    case 'bullet_count_and_length': {
      const bullets = extractBullets(response);
      const targetCount = Number(vars.bullet_count) || 3;
      const wordLimit = Number(vars.word_limit) || 25;
      const countCorrect = bullets.length === targetCount;
      const allUnderLimit = bullets.every(b => wordCount(b) <= wordLimit);
      if (countCorrect && allUnderLimit) return { score: max, reasoning: `${bullets.length} bullets, all under ${wordLimit} words` };
      if (countCorrect) return { score: Math.round(max * 0.6), reasoning: `Correct count (${bullets.length}) but some bullets exceed word limit` };
      return { score: Math.round(max * 0.3), reasoning: `Expected ${targetCount} bullets, got ${bullets.length}` };
    }

    case 'avg_word_count': {
      const bullets = extractBullets(response);
      const wordLimit = Number(vars.word_limit) || 25;
      if (bullets.length === 0) return { score: 0, reasoning: 'No bullets found' };
      const avg = bullets.reduce((sum, b) => sum + wordCount(b), 0) / bullets.length;
      const ratio = Math.min(1, wordLimit / Math.max(avg, 1));
      return { score: Math.round(max * ratio), reasoning: `Average ${avg.toFixed(1)} words per bullet (limit: ${wordLimit})` };
    }

    case 'json_validity': {
      try {
        const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        JSON.parse(cleaned);
        return { score: max, reasoning: 'Valid JSON' };
      } catch {
        return { score: 0, reasoning: 'Invalid JSON' };
      }
    }

    case 'json_keys': {
      try {
        const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsed = JSON.parse(cleaned);
        const fields = String(vars.fields || '').split(',').map(f => f.trim()).filter(Boolean);
        const presentKeys = fields.filter(f => f in parsed);
        const ratio = presentKeys.length / Math.max(fields.length, 1);
        return { score: Math.round(max * ratio), reasoning: `${presentKeys.length}/${fields.length} keys present` };
      } catch {
        return { score: 0, reasoning: 'Could not parse JSON to check keys' };
      }
    }

    case 'json_only': {
      const trimmed = response.trim();
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        return { score: max, reasoning: 'Response is only JSON' };
      }
      if (trimmed.includes('```')) {
        return { score: Math.round(max * 0.3), reasoning: 'JSON is wrapped in code fences' };
      }
      return { score: 0, reasoning: 'Extra content around JSON' };
    }

    case 'json_schema': {
      try {
        const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsed = JSON.parse(cleaned);
        let points = 0;
        const checks: string[] = [];
        if (typeof parsed.title === 'string') { points++; checks.push('title OK'); }
        if (typeof parsed.summary === 'string') {
          const wc = wordCount(parsed.summary);
          if (wc <= 50) { points++; checks.push(`summary OK (${wc} words)`); }
          else { checks.push(`summary too long (${wc} words)`); }
        }
        if (Array.isArray(parsed.tags) && parsed.tags.length === 5) { points++; checks.push('5 tags OK'); }
        else { checks.push(`tags: expected 5, got ${Array.isArray(parsed.tags) ? parsed.tags.length : 'non-array'}`); }
        if (typeof parsed.difficulty === 'number' && parsed.difficulty >= 1 && parsed.difficulty <= 10) { points++; checks.push('difficulty OK'); }
        const ratio = points / 4;
        return { score: Math.round(max * ratio), reasoning: checks.join(', ') };
      } catch {
        return { score: 0, reasoning: 'Invalid JSON, cannot check schema' };
      }
    }

    case 'word_count_range': {
      const wc = wordCount(response);
      if (wc >= 200 && wc <= 300) return { score: max, reasoning: `${wc} words (within 200-300)` };
      if (wc >= 180 && wc <= 320) return { score: Math.round(max * 0.6), reasoning: `${wc} words (close to range)` };
      return { score: Math.round(max * 0.2), reasoning: `${wc} words (outside 200-300 range)` };
    }

    case 'word_count_tolerance': {
      const target = Number(vars.word_count) || 100;
      const wc = wordCount(response);
      const diff = Math.abs(wc - target);
      if (diff <= 5) return { score: max, reasoning: `${wc} words (target: ${target}, within +-5)` };
      if (diff <= 15) return { score: Math.round(max * 0.5), reasoning: `${wc} words (target: ${target}, off by ${diff})` };
      return { score: 0, reasoning: `${wc} words (target: ${target}, off by ${diff})` };
    }

    case 'banned_words': {
      const banned = String(vars.banned_words || '').split(',').map(w => w.trim().toLowerCase()).filter(Boolean);
      const lower = response.toLowerCase();
      const found = banned.filter(w => lower.includes(w));
      if (found.length === 0) return { score: max, reasoning: 'No banned words found' };
      return { score: 0, reasoning: `Found banned words: ${found.join(', ')}` };
    }

    case 'exact_count': {
      const price = String(vars.price || '');
      const searchTerm = `$${price}`;
      const count = response.split(searchTerm).length - 1;
      if (count === 1) return { score: max, reasoning: `Price ${searchTerm} mentioned exactly once` };
      return { score: 0, reasoning: `Price ${searchTerm} mentioned ${count} times (expected 1)` };
    }

    case 'bullet_count': {
      const bullets = extractBullets(response);
      const target = Number(vars.num_features || vars.bullet_count) || 4;
      if (bullets.length === target) return { score: max, reasoning: `Exactly ${target} bullets` };
      return { score: Math.round(max * 0.3), reasoning: `Expected ${target} bullets, got ${bullets.length}` };
    }

    case 'contains_string': {
      if (response.includes('101010')) return { score: max, reasoning: 'Contains 101010 (42 in binary)' };
      return { score: 0, reasoning: '101010 not found' };
    }

    case 'ends_with': {
      const trimmed = response.trim();
      if (trimmed.endsWith('TASK COMPLETE')) return { score: max, reasoning: 'Ends with TASK COMPLETE' };
      return { score: 0, reasoning: 'Does not end with TASK COMPLETE' };
    }

    case 'p_languages': {
      const pLangs = ['python', 'perl', 'php', 'pascal', 'prolog', 'powershell', 'purebasic', 'processing'];
      const lines = response.split('\n').filter(l => l.trim());
      const found = lines.filter(l => pLangs.some(lang => l.toLowerCase().includes(lang)));
      if (found.length >= 3) return { score: max, reasoning: `Found ${found.length} P-languages` };
      return { score: Math.round(max * (found.length / 3)), reasoning: `Found ${found.length}/3 P-languages` };
    }

    case 'sentence_range': {
      const sentences = countSentences(response);
      if (sentences >= 2 && sentences <= 3) return { score: max, reasoning: `${sentences} sentences (within 2-3)` };
      return { score: Math.round(max * 0.5), reasoning: `${sentences} sentences (expected 2-3)` };
    }

    case 'sentence_count': {
      // Check that each key point has a one-sentence summary
      return { score: Math.round(max * 0.7), reasoning: 'Sentence count check (approximate)' };
    }

    case 'key_point_format': {
      const numTarget = Number(vars.num_points) || 5;
      const numberedPattern = /^\d+[\.\)]/gm;
      const matches = response.match(numberedPattern) || [];
      const hasRatings = /[1-5]\/5|\b[1-5]\s*(?:out of|\/)\s*5/gi.test(response) || /importance[:\s]*[1-5]/gi.test(response);
      if (matches.length === numTarget && hasRatings) return { score: max, reasoning: `${matches.length} key points with ratings` };
      if (matches.length === numTarget) return { score: Math.round(max * 0.6), reasoning: `${matches.length} key points but unclear ratings` };
      return { score: Math.round(max * 0.3), reasoning: `Expected ${numTarget} points, found ${matches.length}` };
    }

    case 'numbered_sections': {
      const patterns = [/primary cause/i, /contributing factor/i, /outcome/i, /intervention/i];
      const found = patterns.filter(p => p.test(response));
      const numberedSections = (response.match(/\(\d+\)|\d+[\.\)]/gm) || []).length;
      const present = Math.max(found.length, Math.min(numberedSections, 4));
      const ratio = present / 4;
      return { score: Math.round(max * ratio), reasoning: `${present}/4 required sections found` };
    }

    case 'has_doc_comment': {
      const hasJsDoc = /\/\*\*[\s\S]*?\*\//.test(response);
      const hasPyDoc = /"""[\s\S]*?"""/.test(response) || /'''[\s\S]*?'''/.test(response);
      const hasComment = /\/\/.*\n/.test(response) || /#.*\n/.test(response);
      if (hasJsDoc || hasPyDoc) return { score: max, reasoning: 'Has doc comment' };
      if (hasComment) return { score: Math.round(max * 0.6), reasoning: 'Has comments but not doc-style' };
      return { score: 0, reasoning: 'No documentation found' };
    }

    default:
      return { score: Math.round(max * 0.5), reasoning: `Unknown check: ${check}` };
  }
}

// Utilities
function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function extractBullets(text: string): string[] {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  return lines.filter(l => /^[-*•]\s|^\d+[\.\)]\s/.test(l));
}

function countSentences(text: string): number {
  const matches = text.match(/[.!?]+\s/g);
  return (matches?.length || 0) + (text.trim().match(/[.!?]$/) ? 1 : 0);
}

// Calculate combined score
export function calculateTotalScore(
  algorithmicScores: MetricScore[],
  llmScores: MetricScore[]
): { totalScore: number; maxPossible: number; percentage: number } {
  const all = [...algorithmicScores, ...llmScores];
  let weightedSum = 0;
  let totalWeight = 0;

  for (const s of all) {
    const normalized = s.score / Math.max(s.maxScore, 1);
    weightedSum += normalized * s.weight;
    totalWeight += s.weight;
  }

  const percentage = totalWeight > 0 ? (weightedSum / totalWeight) * 100 : 0;
  return {
    totalScore: Math.round(weightedSum),
    maxPossible: totalWeight,
    percentage: Math.round(percentage),
  };
}
