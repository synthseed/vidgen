import type { MetricPoint, Resolution } from '@/lib/metrics';

function bucketMs(resolution: Resolution): number {
  if (resolution === '5m') return 5 * 60 * 1000;
  if (resolution === '1h') return 60 * 60 * 1000;
  return 24 * 60 * 60 * 1000;
}

function avg(nums: number[]) {
  if (nums.length === 0) return 0;
  return Number((nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2));
}

export function buildRollup(points: MetricPoint[], resolution: Resolution): MetricPoint[] {
  const ms = bucketMs(resolution);
  const groups = new Map<number, MetricPoint[]>();

  for (const point of points) {
    const ts = new Date(point.ts).getTime();
    if (!Number.isFinite(ts)) continue;
    const key = Math.floor(ts / ms) * ms;
    const arr = groups.get(key) || [];
    arr.push(point);
    groups.set(key, arr);
  }

  return [...groups.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([bucketTs, rows]) => ({
      ts: new Date(bucketTs).toISOString(),
      cronFailing: avg(rows.map((r) => r.cronFailing)),
      recallFlagged: avg(rows.map((r) => r.recallFlagged)),
      dreamRuns7d: avg(rows.map((r) => r.dreamRuns7d)),
      activeAgents: avg(rows.map((r) => r.activeAgents))
    }));
}
