import { promises as fs } from 'node:fs';
import path from 'node:path';

const ROOT = process.env.OPENCLAW_WORKSPACE || '/data/repos/vidgen';
const SNAPSHOT_FILE = path.join(ROOT, 'apps/control-center/data/ingest/snapshots.jsonl');
const ROLLUP_DIR = path.join(ROOT, 'apps/control-center/data/ingest/rollups');

export type Resolution = '5m' | '1h' | '1d';
export type Range = '1h' | '24h' | '7d' | '30d';

export type MetricPoint = {
  ts: string;
  cronFailing: number;
  recallFlagged: number;
  dreamRuns7d: number;
  activeAgents: number;
};

export function normalizeRange(input: string | null): Range {
  const value = (input || '24h').toLowerCase();
  if (value === '1h' || value === '24h' || value === '7d' || value === '30d') return value;
  return '24h';
}

export function normalizeResolution(input: string | null, range: Range): Resolution {
  const value = (input || 'auto').toLowerCase();
  if (value === '5m' || value === '1h' || value === '1d') return value;
  if (range === '1h' || range === '24h') return '5m';
  if (range === '7d') return '1h';
  return '1d';
}

function minTsForRange(range: Range): number {
  const now = Date.now();
  if (range === '1h') return now - 60 * 60 * 1000;
  if (range === '24h') return now - 24 * 60 * 60 * 1000;
  if (range === '7d') return now - 7 * 24 * 60 * 60 * 1000;
  return now - 30 * 24 * 60 * 60 * 1000;
}

async function readRawSnapshots(limit = 2000): Promise<MetricPoint[]> {
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

async function readRollup(resolution: '1h' | '1d'): Promise<MetricPoint[]> {
  const file = path.join(ROLLUP_DIR, `${resolution}.json`);
  try {
    const raw = await fs.readFile(file, 'utf8');
    const rows = JSON.parse(raw);
    if (!Array.isArray(rows)) return [];
    return rows as MetricPoint[];
  } catch {
    return [];
  }
}

export async function readMetricHistory(options?: {
  range?: Range;
  resolution?: Resolution;
}): Promise<{ points: MetricPoint[]; source: string; sampleCount: number; freshnessTs?: string }> {
  const range = options?.range || '24h';
  const resolution = options?.resolution || '5m';
  const minTs = minTsForRange(range);

  let points: MetricPoint[] = [];
  let source = 'raw';
  if (resolution === '5m') {
    points = await readRawSnapshots();
  } else {
    points = await readRollup(resolution);
    source = `rollup:${resolution}`;
    if (points.length === 0) {
      points = await readRawSnapshots();
      source = 'raw-fallback';
    }
  }

  const filtered = points
    .filter((p) => new Date(p.ts).getTime() >= minTs)
    .sort((a, b) => a.ts.localeCompare(b.ts));

  return {
    points: filtered,
    source,
    sampleCount: filtered.length,
    freshnessTs: filtered.length > 0 ? filtered[filtered.length - 1].ts : undefined
  };
}
