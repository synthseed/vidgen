import type { OverviewPayload } from '@/lib/types';

type OptimizationInput = {
  cronFailing: number;
  pairingHints: number;
  memoryFlagged: number;
  retryPressure: number;
};

type BaseRecommendation = {
  id: string;
  title: string;
  impact: 'low' | 'medium' | 'high';
  confidence: number;
  evidence: Array<{ signal: string; href?: string }>;
};

function priorityScore(impact: 'low' | 'medium' | 'high', confidence: number) {
  const impactWeight = impact === 'high' ? 1 : impact === 'medium' ? 0.66 : 0.33;
  return Number((impactWeight * confidence).toFixed(3));
}

export function buildOptimizationRecommendations(input: OptimizationInput): OverviewPayload['recommendations'] {
  const recs: Array<BaseRecommendation & { priorityScore: number }> = [];

  if (input.cronFailing > 0) {
    const impact: BaseRecommendation['impact'] = input.cronFailing > 2 ? 'high' : 'medium';
    const confidence = Math.min(0.96, 0.72 + Math.min(input.cronFailing, 5) * 0.05);
    recs.push({
      id: 'cron-failures-hotspot',
      title: 'Prioritize failing cron jobs and align retry backoff windows',
      impact,
      confidence,
      evidence: [
        { signal: `${input.cronFailing} failing/stopped cron entries`, href: '/control-center/cron' },
        { signal: 'Signal source: openclaw cron list', href: '/control-center/api/drilldown/cron' }
      ],
      priorityScore: priorityScore(impact, confidence)
    });
  }

  if (input.pairingHints > 0) {
    const impact: BaseRecommendation['impact'] = input.pairingHints > 2 ? 'high' : 'medium';
    const confidence = Math.min(0.92, 0.68 + Math.min(input.pairingHints, 5) * 0.06);
    recs.push({
      id: 'connection-pairing-loop',
      title: 'Resolve pairing-required loops to reduce command retries',
      impact,
      confidence,
      evidence: [
        { signal: `${input.pairingHints} pairing-required signals`, href: '/control-center/connections' },
        { signal: `Retry pressure proxy score: ${input.retryPressure}` }
      ],
      priorityScore: priorityScore(impact, confidence)
    });
  }

  if (input.memoryFlagged > 0) {
    const impact: BaseRecommendation['impact'] = input.memoryFlagged > 3 ? 'high' : 'medium';
    const confidence = Math.min(0.9, 0.62 + Math.min(input.memoryFlagged, 6) * 0.04);
    recs.push({
      id: 'memory-flagged-observations',
      title: 'Address hardened-memory flagged observations before drift compounds',
      impact,
      confidence,
      evidence: [
        { signal: `${input.memoryFlagged} flagged observations`, href: '/control-center/api/overview?range=7d' },
        { signal: 'Correlated with reliability drop risk in last window' }
      ],
      priorityScore: priorityScore(impact, confidence)
    });
  }

  return recs
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .map((r) => ({
      id: r.id,
      title: r.title,
      impact: r.impact,
      confidence: Number(r.confidence.toFixed(2)),
      priorityScore: r.priorityScore,
      evidence: r.evidence
    }));
}
