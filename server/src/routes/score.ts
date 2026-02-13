import { Router } from 'express';
import type { ProviderName, ScoreRequest, ScoreResponse } from '../../../shared/types.js';
import { getProvider, getAllProviders } from '../providers/index.js';

const router = Router();

function getJudgeProvider(): { provider: ReturnType<typeof getProvider>; model: string } | null {
  // Prefer Claude for judging, fallback to Gemini, then Blackbox
  const preferences: { name: ProviderName; model: string }[] = [
    { name: 'claude', model: 'claude-sonnet-4-20250514' },
    { name: 'gemini', model: 'gemini-2.0-flash' },
    { name: 'blackbox', model: 'gpt-4o' },
  ];

  for (const pref of preferences) {
    try {
      const provider = getProvider(pref.name);
      if (provider.isConfigured()) {
        return { provider, model: pref.model };
      }
    } catch {
      continue;
    }
  }
  return null;
}

router.post('/score', async (req, res) => {
  try {
    const body = req.body as ScoreRequest;

    if (!body.originalPrompt || !body.modelResponse || !body.rubricMetrics?.length) {
      res.status(400).json({ error: 'Missing required fields: originalPrompt, modelResponse, rubricMetrics' });
      return;
    }

    // Determine judge
    let judgeProvider: ReturnType<typeof getProvider>;
    let judgeModel: string;

    if (body.judgeProvider && body.judgeModel) {
      judgeProvider = getProvider(body.judgeProvider);
      judgeModel = body.judgeModel;
    } else {
      const judge = getJudgeProvider();
      if (!judge) {
        res.status(400).json({ error: 'No judge model available. Configure at least one API key.' });
        return;
      }
      judgeProvider = judge.provider;
      judgeModel = judge.model;
    }

    const startTime = Date.now();
    const scores: ScoreResponse['scores'] = [];

    // Score each metric individually for better granularity
    for (const metric of body.rubricMetrics) {
      const referenceSection = body.referenceAnswer
        ? `\nReference answer for comparison:\n---\n${body.referenceAnswer}\n---`
        : '';

      const judgePrompt = metric.llmJudgePrompt || `Evaluate the AI response on the metric "${metric.name}": ${metric.description}`;

      const messages = [
        {
          role: 'system' as const,
          content: `You are an impartial AI evaluator. Score responses strictly and fairly. Always respond with ONLY a valid JSON object, no other text.`,
        },
        {
          role: 'user' as const,
          content: `${judgePrompt}

Score on a scale of ${metric.scale.min} to ${metric.scale.max}.

Original prompt given to the AI:
---
${body.originalPrompt}
---

AI's response:
---
${body.modelResponse}
---
${referenceSection}

Respond ONLY with a JSON object in this exact format: {"score": <number>, "reasoning": "<brief explanation>"}`,
        },
      ];

      try {
        const result = await judgeProvider.chat({
          model: judgeModel,
          messages,
          temperature: 0,
          maxTokens: 300,
        });

        // Parse the judge response
        const jsonMatch = result.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          scores.push({
            metricId: metric.id,
            score: Math.min(Math.max(parsed.score, metric.scale.min), metric.scale.max),
            maxScore: metric.scale.max,
            reasoning: parsed.reasoning || 'No reasoning provided',
          });
        } else {
          scores.push({
            metricId: metric.id,
            score: 0,
            maxScore: metric.scale.max,
            reasoning: 'Failed to parse judge response',
          });
        }
      } catch (err: any) {
        scores.push({
          metricId: metric.id,
          score: 0,
          maxScore: metric.scale.max,
          reasoning: `Judge error: ${err.message}`,
        });
      }
    }

    const response: ScoreResponse = {
      scores,
      judgeModel: `${judgeProvider.name}/${judgeModel}`,
      latencyMs: Date.now() - startTime,
    };

    res.json(response);
  } catch (err: any) {
    console.error('Score error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
