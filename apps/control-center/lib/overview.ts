import { promises as fs } from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const ROOT = process.env.OPENCLAW_WORKSPACE || '/data/repos/vidgen';

export type SourceState = 'ok' | 'degraded' | 'error';

export type OverviewPayload = {
  generatedAt: string;
  range: string;
  kpis: {
    overallHealth: string;
    cronJobs: number;
    cronFailing: number;
    recallFlagged: number;
    dreamRuns7d: number;
    activeAgents: number;
  };
  modules: {
    cron: { state: SourceState; summary: string; details?: string[] };
    memory: { state: SourceState; summary: string; recommendation?: string };
    dreamCycle: { state: SourceState; summary: string; latestOk?: boolean };
    agentUsage: { state: SourceState; summary: string; topAgents: Array<{ id: string; sessions: number }> };
  };
  sourceHealth: Array<{ source: string; state: SourceState; note?: string }>;
};

async function runOpenclaw(args: string[]): Promise<string> {
  const { stdout } = await execFileAsync('openclaw', args, { timeout: 15000 });
  return stdout;
}

async function readDashboardJson() {
  const dashboardPath = path.join(ROOT, 'memory/hardened/dashboard.json');
  const raw = await fs.readFile(dashboardPath, 'utf8');
  return JSON.parse(raw);
}

function parseCronCounts(text: string): { total: number; failing: number } {
  const lines = text.split(/\r?\n/);
  const jobLines = lines.filter((line) => /\bcron\b|healthcheck:|hardened-memory:/i.test(line));
  const failing = lines.filter((line) => /fail|error|stopped|disabled/i.test(line)).length;
  return { total: Math.max(jobLines.length, 0), failing: Math.max(failing, 0) };
}

function parseAgentUsage(statusDeep: string): Array<{ id: string; sessions: number }> {
  const counts = new Map<string, number>();
  const matches = statusDeep.match(/agent:([a-zA-Z0-9_\-]+):/g) || [];
  for (const token of matches) {
    const id = token.replace('agent:', '').replace(':', '');
    counts.set(id, (counts.get(id) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([id, sessions]) => ({ id, sessions }))
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 5);
}

export async function getOverview(range = '24h'): Promise<OverviewPayload> {
  const sourceHealth: OverviewPayload['sourceHealth'] = [];

  let cronTotal = 0;
  let cronFailing = 0;
  let memoryFlagged = 0;
  let dreamRuns7d = 0;
  let dreamLatestOk: boolean | undefined = undefined;
  let memoryRecommendation = 'unknown';
  let topAgents: Array<{ id: string; sessions: number }> = [];

  try {
    const dashboard = await readDashboardJson();
    memoryFlagged = Number(dashboard?.observations?.flaggedCount || 0);
    dreamRuns7d = Number(dashboard?.dreamCycle?.last7Runs || 0);
    dreamLatestOk = dashboard?.dreamCycle?.latest?.ok;
    memoryRecommendation = String(dashboard?.recommendation || 'unknown');
    sourceHealth.push({ source: 'memory/hardened/dashboard.json', state: 'ok' });
  } catch (error) {
    sourceHealth.push({ source: 'memory/hardened/dashboard.json', state: 'error', note: String(error) });
  }

  try {
    const cronOut = await runOpenclaw(['cron', 'list']);
    const parsed = parseCronCounts(cronOut);
    cronTotal = parsed.total;
    cronFailing = parsed.failing;
    sourceHealth.push({ source: 'openclaw cron list', state: 'ok' });
  } catch (error) {
    sourceHealth.push({ source: 'openclaw cron list', state: 'degraded', note: String(error) });
  }

  try {
    const statusOut = await runOpenclaw(['status', '--deep']);
    topAgents = parseAgentUsage(statusOut);
    sourceHealth.push({ source: 'openclaw status --deep', state: 'ok' });
  } catch (error) {
    sourceHealth.push({ source: 'openclaw status --deep', state: 'degraded', note: String(error) });
  }

  const activeAgents = topAgents.length;
  const hasError = sourceHealth.some((s) => s.state === 'error');
  const hasDegraded = sourceHealth.some((s) => s.state === 'degraded');
  const overallHealth = hasError ? 'critical' : hasDegraded ? 'degraded' : 'healthy';

  return {
    generatedAt: new Date().toISOString(),
    range,
    kpis: {
      overallHealth,
      cronJobs: cronTotal,
      cronFailing,
      recallFlagged: memoryFlagged,
      dreamRuns7d,
      activeAgents
    },
    modules: {
      cron: {
        state: cronFailing > 0 ? 'degraded' : cronTotal > 0 ? 'ok' : 'degraded',
        summary: cronTotal > 0 ? `${cronTotal} jobs tracked` : 'No cron jobs detected'
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
      }
    },
    sourceHealth
  };
}
