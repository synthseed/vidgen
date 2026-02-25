#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const root = process.env.OPENCLAW_WORKSPACE || require('node:path').resolve(process.cwd(), '../..');
const outFile = path.join(root, 'apps/control-center/data/ingest/snapshots.jsonl');
const keepDays = Number(process.env.CONTROL_CENTER_RETENTION_DAYS || 7);
const cutoff = Date.now() - keepDays * 24 * 60 * 60 * 1000;

if (!fs.existsSync(outFile)) {
  console.log('no snapshots file present; nothing to prune');
  process.exit(0);
}

const lines = fs.readFileSync(outFile, 'utf8').split(/\r?\n/).filter(Boolean);
const kept = lines.filter((line) => {
  try {
    const row = JSON.parse(line);
    return new Date(row.ts).getTime() >= cutoff;
  } catch {
    return false;
  }
});

fs.writeFileSync(outFile, `${kept.join('\n')}${kept.length ? '\n' : ''}`);
console.log(`pruned snapshots: kept ${kept.length}/${lines.length} rows (retention ${keepDays}d)`);
