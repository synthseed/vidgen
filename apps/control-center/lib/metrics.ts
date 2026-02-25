import { promises as fs } from 'node:fs';
import path from 'node:path';

const ROOT = process.env.OPENCLAW_WORKSPACE || '/data/repos/vidgen';
const SNAPSHOT_FILE = path.join(ROOT, 'apps/control-center/data/ingest/snapshots.jsonl');

export type MetricPoint = {
  ts: string;
  cronFailing: number;
  recallFlagged: number;
  dreamRuns7d: number;
  activeAgents: number;
};

export async function readMetricHistory(limit = 120): Promise<MetricPoint[]> {
  try {
    const raw = await fs.readFile(SNAPSHOT_FILE, 'utf8');
    const lines = raw.split(/\r?\n/).filter(Boolean);
    const out: MetricPoint[] = [];
    for (const line of lines.slice(-limit)) {
      try {
        const row = JSON.parse(line);
        out.push({
          ts: row.ts,
          cronFailing: Number(row.metrics?.cronFailing || 0),
          recallFlagged: Number(row.metrics?.recallFlagged || 0),
          dreamRuns7d: Number(row.metrics?.dreamRuns7d || 0),
          activeAgents: Number(row.metrics?.activeAgents || 0)
        });
      } catch {
        // ignore malformed lines
      }
    }
    return out;
  } catch {
    return [];
  }
}
