#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = process.env.OPENCLAW_WORKSPACE || process.cwd();
const logDir = path.join(root, 'memory/hardened/dream-logs');
const metricsDir = path.join(root, 'memory/hardened/metrics');

fs.mkdirSync(metricsDir, { recursive: true });

if (!fs.existsSync(logDir)) {
  console.error('dream-log-verify: missing dream-logs directory');
  process.exit(1);
}

const files = fs.readdirSync(logDir).filter((f) => f.startsWith('dream-') && f.endsWith('.md')).sort();
if (!files.length) {
  console.error('dream-log-verify: no dream log files found');
  process.exit(1);
}

const latest = files[files.length - 1];
const latestPath = path.join(logDir, latest);
const content = fs.readFileSync(latestPath, 'utf8');
const required = ['# Dream Cycle', '- runAt:', '- model:', '- readOnly:', '- sourceCount:', '- archiveCandidateCount:', '- retainCount:'];
for (const r of required) {
  if (!content.includes(r)) {
    console.error(`dream-log-verify: latest log missing required field: ${r}`);
    process.exit(1);
  }
}

const record = {
  verifiedAt: new Date().toISOString(),
  latestLog: latest,
  ok: true
};

const out = path.join(metricsDir, 'dream-log-verify.jsonl');
fs.appendFileSync(out, JSON.stringify(record) + '\n');
console.log(`dream-log-verify: OK (${latest})`);
