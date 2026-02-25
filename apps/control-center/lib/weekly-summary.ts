import { promises as fs } from 'node:fs';
import path from 'node:path';
import { readMetricHistory } from '@/lib/metrics';
import { getOverview } from '@/lib/overview';

const ROOT = process.env.OPENCLAW_WORKSPACE || '/data/repos/vidgen';
const SUMMARY_DIR = path.join(ROOT, 'apps/control-center/data/ingest/weekly-summary');
const SUMMARY_FILE = path.join(SUMMARY_DIR, 'latest.json');

function avg(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export async function generateWeeklySummary() {
  const [overview, metrics] = await Promise.all([
    getOverview('7d'),
    readMetricHistory({ range: '7d', resolution: '1h' })
  ]);

  const points = metrics.points;
  const avgCronFailing = Number(avg(points.map((p) => p.cronFailing)).toFixed(2));
  const avgActiveAgents = Number(avg(points.map((p) => p.activeAgents)).toFixed(2));
  const maxFlagged = points.reduce((max, p) => Math.max(max, p.recallFlagged), 0);

  const prioritizedActions = [
    ...(overview.kpis.cronFailing > 0
      ? [{ priority: 1, action: 'Repair failing cron jobs', expectedImpact: 'Reduce missed automation windows' }]
      : []),
    ...(overview.modules.connection.pairingRequiredHints > 0
      ? [{ priority: 2, action: 'Resolve pairing-required sessions', expectedImpact: 'Stabilize gateway/session connectivity' }]
      : []),
    ...(maxFlagged > 0
      ? [{ priority: 3, action: 'Address hardened-memory flagged observations', expectedImpact: 'Lower reliability drift risk' }]
      : [])
  ];

  const summary = {
    generatedAt: new Date().toISOString(),
    window: '7d',
    snapshot: {
      avgCronFailing,
      avgActiveAgents,
      maxFlagged,
      fallbackUsed: overview.fallbackUsed,
      freshness: overview.freshness
    },
    recommendations: overview.recommendations,
    prioritizedActions,
    evidence: {
      sourceHealth: overview.sourceHealth,
      incidents: overview.incidentTimeline.slice(-10)
    }
  };

  await fs.mkdir(SUMMARY_DIR, { recursive: true });
  await fs.writeFile(SUMMARY_FILE, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');

  return { summary, artifactPath: SUMMARY_FILE };
}

export async function readWeeklySummaryArtifact() {
  try {
    const raw = await fs.readFile(SUMMARY_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
