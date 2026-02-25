#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const root = process.env.OPENCLAW_WORKSPACE || '/data/repos/vidgen';
const envFile = process.env.CONTROL_CENTER_ENV_FILE || path.join(root, 'ops/systemd/vidgen-control-center.env.example');

const content = fs.existsSync(envFile) ? fs.readFileSync(envFile, 'utf8') : '';
const checks = [
  { key: 'CONTROL_CENTER_API_TOKEN', ok: /CONTROL_CENTER_API_TOKEN=/.test(content) || Boolean(process.env.CONTROL_CENTER_API_TOKEN), why: 'API token should be set for tailnet-exposed API routes.' },
  { key: 'CONTROL_CENTER_RATE_LIMIT_CAPACITY', ok: /CONTROL_CENTER_RATE_LIMIT_CAPACITY=/.test(content) || Boolean(process.env.CONTROL_CENTER_RATE_LIMIT_CAPACITY), why: 'Rate-limit capacity should be explicit.' },
  { key: 'CONTROL_CENTER_RATE_LIMIT_WINDOW_MS', ok: /CONTROL_CENTER_RATE_LIMIT_WINDOW_MS=/.test(content) || Boolean(process.env.CONTROL_CENTER_RATE_LIMIT_WINDOW_MS), why: 'Rate-limit window should be explicit.' }
];

let failed = 0;
for (const check of checks) {
  if (check.ok) {
    console.log(`OK ${check.key}`);
  } else {
    failed += 1;
    console.error(`MISSING ${check.key}: ${check.why}`);
  }
}

if (failed > 0) process.exit(1);
