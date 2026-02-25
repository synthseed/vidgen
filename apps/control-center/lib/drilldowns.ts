import { readMetricHistory } from '@/lib/metrics';
import { getOverview } from '@/lib/overview';

export async function getCronDrilldown(range = '7d') {
  const [overview, metrics] = await Promise.all([
    getOverview(range),
    readMetricHistory({ range: range === '30d' ? '30d' : '7d', resolution: '1h' })
  ]);

  const points = metrics.points;
  const maxFailing = points.reduce((max, p) => Math.max(max, p.cronFailing), 0);
  const failureSamples = points.filter((p) => p.cronFailing > 0).length;
  const reliability = overview.modules.cron.diagnostics.reliability;

  return {
    generatedAt: new Date().toISOString(),
    range,
    summary: {
      cronJobs: overview.kpis.cronJobs,
      currentlyFailing: overview.kpis.cronFailing,
      peakFailing: maxFailing,
      failureSamples,
      reliability
    },
    categories: [
      { type: 'fail_or_error', count: failureSamples, note: 'Detected from cronFailing history points > 0' },
      { type: 'pairing_required_impact', count: overview.modules.connection.pairingRequiredHints, note: 'Signals that often correlate with missed automation windows' }
    ],
    incidents: overview.incidentTimeline.filter((i) => i.source.includes('cron'))
  };
}

export async function getAgentsDrilldown(range = '7d') {
  const [overview, metrics] = await Promise.all([
    getOverview(range),
    readMetricHistory({ range: range === '30d' ? '30d' : '7d', resolution: '1h' })
  ]);

  const activeSeries = metrics.points.map((p) => ({ ts: p.ts, activeAgents: p.activeAgents }));
  const peakActiveAgents = activeSeries.reduce((max, p) => Math.max(max, p.activeAgents), 0);

  return {
    generatedAt: new Date().toISOString(),
    range,
    summary: {
      currentlyActive: overview.kpis.activeAgents,
      peakActiveAgents,
      topAgents: overview.modules.agentUsage.topAgents,
      recommendationCount: overview.recommendations.length
    },
    latencyBands: [
      { band: 'fast', description: 'No timeout/error signals in source health', score: overview.sourceHealth.some((s) => s.note?.includes('timeout')) ? 0 : 1 },
      { band: 'slow_or_blocked', description: 'Estimated from timeout/exec incidents', score: overview.incidentTimeline.filter((i) => /timeout|exec_error/.test(i.type)).length }
    ],
    incidents: overview.incidentTimeline.filter((i) => i.source.includes('status'))
  };
}

export async function getConnectionsDrilldown(range = '24h') {
  const overview = await getOverview(range);
  const pairing = overview.modules.connection.pairingRequiredHints;

  return {
    generatedAt: new Date().toISOString(),
    range,
    summary: {
      state: overview.modules.connection.state,
      pairingRequiredHints: pairing,
      freshness: overview.freshness,
      fallbackUsed: overview.fallbackUsed
    },
    timeline: overview.incidentTimeline
      .filter((i) => i.source.includes('status') || i.type.includes('pairing'))
      .map((i) => ({ ...i, normalizedType: i.type === 'pairing_required' ? 'auth_state' : 'runtime_signal' })),
    sourceHealth: overview.sourceHealth.filter((s) => s.source.includes('status') || s.source.includes('cron'))
  };
}
