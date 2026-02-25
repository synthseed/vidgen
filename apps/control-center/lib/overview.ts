import { promises as fs } from 'node:fs';
import { freshnessFromTs, readJsonFile, runOpenclaw, workspacePath } from '@/lib/source-adapters';
import type { OverviewPayload, SourceHealth } from '@/lib/types';
import { buildOptimizationRecommendations } from '@/lib/optimization';
import { readMetricHistory } from '@/lib/metrics';
import { buildAgentScorecards } from '@/lib/scorecards';
import { detectSkillOpportunities } from '@/lib/skill-opportunities';
import { getWorkflowSkeletons } from '@/lib/workflows';

function parseCronCounts(text: string): { total: number; failing: number } {
  const lines = text.split(/\r?\n/).filter(Boolean);
  const jobLines = lines.filter((line) => /healthcheck:|hardened-memory:|autosync|cron/i.test(line));
  const failing = lines.filter((line) => /fail|error|stopped|disabled/i.test(line)).length;
  return { total: jobLines.length, failing };
}

function parseAgentUsage(statusDeep: string): Array<{ id: string; sessions: number; reliability: number }> {
  const counts = new Map<string, number>();
  const errors = new Map<string, number>();
  for (const line of statusDeep.split(/\r?\n/)) {
    const m = line.match(/agent:([a-zA-Z0-9_\-]+):/);
    if (!m) continue;
    const id = m[1];
    counts.set(id, (counts.get(id) || 0) + 1);
    if (/error|fail|timeout|retry/i.test(line)) errors.set(id, (errors.get(id) || 0) + 1);
  }

  return [...counts.entries()]
    .map(([id, sessions]) => {
      const err = errors.get(id) || 0;
      const reliability = sessions > 0 ? Math.max(0, Math.min(1, 1 - err / sessions)) : 1;
      return { id, sessions, reliability };
    })
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 5);
}

async function readLastSnapshotTs(): Promise<string | null> {
  const snapshotFile = workspacePath('apps/control-center/data/ingest/snapshots.jsonl');
  try {
    const raw = await fs.readFile(snapshotFile, 'utf8');
    const last = raw.split(/\r?\n/).filter(Boolean).slice(-1)[0];
    if (!last) return null;
    return JSON.parse(last).ts || null;
  } catch {
    return null;
  }
}

function sourceStateFromError(code?: string): 'degraded' | 'error' {
  if (!code) return 'degraded';
  return code === 'parse_error' || code === 'io_error' ? 'error' : 'degraded';
}

export async function getOverview(range = '24h'): Promise<OverviewPayload> {
  const sourceHealth: SourceHealth[] = [];
  const incidents: OverviewPayload['incidentTimeline'] = [];

  let cronTotal = 0;
  let cronFailing = 0;
  let memoryFlagged = 0;
  let dreamRuns7d = 0;
  let dreamLatestOk: boolean | undefined;
  let memoryRecommendation = 'unknown';
  let topAgents: Array<{ id: string; sessions: number; reliability: number }> = [];
  let pairingHints = 0;

  const memPath = workspacePath('memory/hardened/dashboard.json');
  const memResult = await readJsonFile<any>(memPath);
  if (memResult.ok && memResult.value) {
    const dashboard = memResult.value;
    memoryFlagged = Number(dashboard?.observations?.flaggedCount || 0);
    dreamRuns7d = Number(dashboard?.dreamCycle?.last7Runs || 0);
    dreamLatestOk = dashboard?.dreamCycle?.latest?.ok;
    memoryRecommendation = String(dashboard?.recommendation || 'unknown');
    sourceHealth.push({ source: 'memory/hardened/dashboard.json', state: 'ok', lastSuccessfulAt: memResult.at, freshness: 'live' });
  } else {
    const code = memResult.error?.code;
    sourceHealth.push({ source: 'memory/hardened/dashboard.json', state: sourceStateFromError(code), note: memResult.error?.message });
    incidents.push({ ts: memResult.at, severity: 'critical', source: 'memory/hardened/dashboard.json', type: code || 'io_error', message: memResult.error?.message || 'memory source unavailable' });
  }

  const cronResult = await runOpenclaw(['cron', 'list']);
  if (cronResult.ok && cronResult.value) {
    const parsed = parseCronCounts(cronResult.value);
    cronTotal = parsed.total;
    cronFailing = parsed.failing;
    sourceHealth.push({ source: 'openclaw cron list', state: cronFailing > 0 ? 'degraded' : 'ok', lastSuccessfulAt: cronResult.at, freshness: 'live' });
    if (cronFailing > 0) {
      incidents.push({ ts: cronResult.at, severity: 'warn', source: 'openclaw cron list', type: 'cron_failures', message: `${cronFailing} failing or stopped cron entries detected` });
    }
  } else {
    sourceHealth.push({ source: 'openclaw cron list', state: sourceStateFromError(cronResult.error?.code), note: cronResult.error?.message });
    incidents.push({ ts: cronResult.at, severity: 'warn', source: 'openclaw cron list', type: cronResult.error?.code || 'exec_error', message: cronResult.error?.message || 'cron source unavailable' });
  }

  const statusResult = await runOpenclaw(['status', '--deep']);
  let retrySignals = 0;
  if (statusResult.ok && statusResult.value) {
    topAgents = parseAgentUsage(statusResult.value);
    pairingHints = (statusResult.value.match(/pairing required/gi) || []).length;
    retrySignals = (statusResult.value.match(/retry|reconnect|backoff/gi) || []).length;
    sourceHealth.push({ source: 'openclaw status --deep', state: pairingHints > 0 ? 'degraded' : 'ok', lastSuccessfulAt: statusResult.at, freshness: 'live' });
    if (pairingHints > 0) {
      incidents.push({ ts: statusResult.at, severity: 'warn', source: 'openclaw status --deep', type: 'pairing_required', message: `${pairingHints} pairing-required signal(s) observed` });
    }
  } else {
    sourceHealth.push({ source: 'openclaw status --deep', state: sourceStateFromError(statusResult.error?.code), note: statusResult.error?.message });
    incidents.push({ ts: statusResult.at, severity: 'warn', source: 'openclaw status --deep', type: statusResult.error?.code || 'exec_error', message: statusResult.error?.message || 'status source unavailable' });
  }

  const activeAgents = topAgents.length;
  const hasError = sourceHealth.some((s) => s.state === 'error');
  const hasDegraded = sourceHealth.some((s) => s.state === 'degraded');
  const overallHealth = hasError ? 'critical' : hasDegraded ? 'degraded' : 'healthy';
  const fallbackUsed = hasError || hasDegraded;

  const snapshotTs = await readLastSnapshotTs();
  const freshness = freshnessFromTs(snapshotTs);
  const ingestLagMinutes = snapshotTs ? Math.max(0, Math.round((Date.now() - new Date(snapshotTs).getTime()) / 60000)) : null;

  const metrics = await readMetricHistory({ range: '7d', resolution: '1h' });
  const timeoutIncidents = incidents.filter((i) => /timeout|exec_error/.test(i.type)).length;

  const recommendations = buildOptimizationRecommendations({
    cronFailing,
    pairingHints,
    memoryFlagged,
    retryPressure: retrySignals + timeoutIncidents
  });

  const scorecards = buildAgentScorecards({
    topAgents,
    points: metrics.points,
    timeoutIncidents,
    retrySignals
  });

  const skillOpportunities = detectSkillOpportunities({ incidents, recommendations });

  return {
    generatedAt: new Date().toISOString(),
    range,
    fallbackUsed,
    freshness,
    kpis: {
      overallHealth,
      cronJobs: cronTotal,
      cronFailing,
      recallFlagged: memoryFlagged,
      dreamRuns7d,
      activeAgents,
      ingestLagMinutes
    },
    modules: {
      cron: {
        state: cronFailing > 0 ? 'degraded' : cronTotal > 0 ? 'ok' : 'degraded',
        summary: cronTotal > 0 ? `${cronTotal} jobs tracked` : 'No cron jobs detected',
        diagnostics: {
          failingJobs: cronFailing,
          reliability: cronTotal > 0 ? Number(((cronTotal - cronFailing) / cronTotal).toFixed(2)) : null
        }
      },
      memory: {
        state: memoryFlagged > 0 ? 'degraded' : 'ok',
        summary: `${memoryFlagged} flagged signals`,
        recommendation: memoryRecommendation
      },
      dreamCycle: {
        state: dreamLatestOk === false ? 'degraded' : 'ok',
        summary: `${dreamRuns7d} runs in last window`,
        latestOk: dreamLatestOk
      },
      agentUsage: {
        state: topAgents.length > 0 ? 'ok' : 'degraded',
        summary: `${topAgents.length} active agents`,
        topAgents
      },
      connection: {
        state: pairingHints > 0 ? 'degraded' : 'ok',
        summary: pairingHints > 0 ? `${pairingHints} pairing-required signals` : 'No pairing issues detected',
        pairingRequiredHints: pairingHints
      }
    },
    incidentTimeline: incidents.sort((a, b) => a.ts.localeCompare(b.ts)).slice(-20),
    recommendations,
    scorecards,
    skillOpportunities,
    workflows: getWorkflowSkeletons(),
    sourceHealth: sourceHealth.map((source) => ({ ...source, freshness: source.freshness || freshnessFromTs(source.lastSuccessfulAt || null) }))
  };
}
