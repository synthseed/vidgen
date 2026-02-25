import type { AgentScorecard } from '@/lib/types';
import type { MetricPoint } from '@/lib/metrics';

function avg(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function buildAgentScorecards(input: {
  topAgents: Array<{ id: string; sessions: number; reliability: number }>;
  points: MetricPoint[];
  timeoutIncidents: number;
  retrySignals: number;
}): AgentScorecard[] {
  const current = input.points.slice(-24);
  const previous = input.points.slice(-48, -24);

  const currentFailing = avg(current.map((p) => p.cronFailing));
  const previousFailing = avg(previous.map((p) => p.cronFailing));
  const currentActive = avg(current.map((p) => p.activeAgents));
  const previousActive = avg(previous.map((p) => p.activeAgents));

  const reliabilityDelta = Number((previousFailing - currentFailing).toFixed(2));
  const latencyDelta = Number((currentFailing - previousFailing).toFixed(2));
  const retryDelta = Number((input.retrySignals / Math.max(1, current.length) - input.retrySignals / Math.max(1, previous.length || 1)).toFixed(2));

  return input.topAgents.map((agent) => {
    const retryPressure = Number((Math.min(1, (input.retrySignals + input.timeoutIncidents) / Math.max(1, agent.sessions * 2))).toFixed(2));
    const latencyScore = Number(Math.max(0, Math.min(1, 1 - currentFailing / Math.max(1, currentActive || agent.sessions))).toFixed(2));

    return {
      id: agent.id,
      reliability: Number(agent.reliability.toFixed(2)),
      latencyScore,
      retryPressure,
      trendDelta: {
        reliability: reliabilityDelta,
        latency: latencyDelta,
        retries: retryDelta
      }
    };
  });
}
