#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = process.env.OPENCLAW_WORKSPACE || '/data/repos/vidgen';
const dashboardPath = path.join(root, 'memory/hardened/dashboard.json');

if (!fs.existsSync(dashboardPath)) {
  throw new Error(`missing ${dashboardPath}`);
}

const dashboard = JSON.parse(fs.readFileSync(dashboardPath, 'utf8'));
if (!dashboard.generatedAt) {
  throw new Error('dashboard.generatedAt missing');
}

const cronOut = execFileSync('openclaw', ['cron', 'list'], { encoding: 'utf8' });
if (!cronOut || !cronOut.trim()) {
  throw new Error('openclaw cron list returned empty output');
}

console.log('overview smoke ok');
console.log(JSON.stringify({
  generatedAt: dashboard.generatedAt,
  recommendation: dashboard.recommendation
}, null, 2));
