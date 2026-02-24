#!/usr/bin/env node

const fs = require('fs');

function fail(msg) {
  console.error(`PR evidence check failed: ${msg}`);
  process.exit(1);
}

const eventName = process.env.GITHUB_EVENT_NAME || '';
if (eventName !== 'pull_request') {
  console.log(`PR evidence check skipped for event=${eventName || 'unknown'}`);
  process.exit(0);
}

const eventPath = process.env.GITHUB_EVENT_PATH;
if (!eventPath || !fs.existsSync(eventPath)) {
  fail('GITHUB_EVENT_PATH is missing');
}

const payload = JSON.parse(fs.readFileSync(eventPath, 'utf8'));
const pr = payload.pull_request || {};
const baseRef = pr.base && pr.base.ref;
const headRef = pr.head && pr.head.ref;

if (baseRef !== 'main' || headRef !== 'dev') {
  console.log(`PR evidence check skipped for ${headRef || 'unknown'} -> ${baseRef || 'unknown'}`);
  process.exit(0);
}

const body = String(pr.body || '');
const requiredPhrases = [
  '## Requirements Audit',
  '## Validation',
  '## Supervised Autonomy Evidence',
  'Run metadata',
  'Rollback SHA',
  'Reliability guardian signoff',
  'Human approval record'
];

for (const phrase of requiredPhrases) {
  if (!body.includes(phrase)) {
    fail(`missing required PR body content: ${phrase}`);
  }
}

console.log('PR evidence check passed for dev -> main');
