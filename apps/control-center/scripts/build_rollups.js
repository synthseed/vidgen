#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const root = process.env.OPENCLAW_WORKSPACE || require('node:path').resolve(process.cwd(), '../..');
const inFile = path.join(root, 'apps/control-center/data/ingest/snapshots.jsonl');
const rollupDir = path.join(root, 'apps/control-center/data/ingest/rollups');

function avg(nums) {
  if (nums.length === 0) return 0;
  return Number((nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2));
}

function toPoint(row) {
  return {
    ts: row.ts,
    cronFailing: Number(row.metrics?.cronFailing || 0),
    recallFlagged: Number(row.metrics?.recallFlagged || 0),
    dreamRuns7d: Number(row.metrics?.dreamRuns7d || 0),
    activeAgents: Number(row.metrics?.activeAgents || 0)
  };
}

function rollup(points, bucketMs) {
  const groups = new Map();
  for (const p of points) {
    const t = new Date(p.ts).getTime();
    if (!Number.isFinite(t)) continue;
    const key = Math.floor(t / bucketMs) * bucketMs;
    const arr = groups.get(key) || [];
    arr.push(p);
    groups.set(key, arr);
  }
  return [...groups.entries()].sort((a, b) => a[0] - b[0]).map(([k, rows]) => ({
    ts: new Date(k).toISOString(),
    cronFailing: avg(rows.map((r) => r.cronFailing)),
    recallFlagged: avg(rows.map((r) => r.recallFlagged)),
    dreamRuns7d: avg(rows.map((r) => r.dreamRuns7d)),
    activeAgents: avg(rows.map((r) => r.activeAgents))
  }));
}

if (!fs.existsSync(inFile)) {
  console.log('no snapshots to roll up');
  process.exit(0);
}

const points = fs.readFileSync(inFile, 'utf8').split(/\r?\n/).filter(Boolean).map((line) => {
  try {
    return toPoint(JSON.parse(line));
  } catch {
    return null;
  }
}).filter(Boolean);

fs.mkdirSync(rollupDir, { recursive: true });
fs.writeFileSync(path.join(rollupDir, '1h.json'), JSON.stringify(rollup(points, 60 * 60 * 1000), null, 2));
fs.writeFileSync(path.join(rollupDir, '1d.json'), JSON.stringify(rollup(points, 24 * 60 * 60 * 1000), null, 2));
console.log(`built rollups from ${points.length} points -> ${rollupDir}`);
