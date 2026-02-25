#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = process.env.OPENCLAW_WORKSPACE || require('node:path').resolve(process.cwd(), '../..');
const outDir = path.join(root, 'apps/control-center/data/ingest');
const outFile = path.join(outDir, 'snapshots.jsonl');
const memFile = path.join(root, 'memory/hardened/dashboard.json');

function safeOpenclaw(args) {
  try {
    return execFileSync('openclaw', args, { encoding: 'utf8', timeout: 15000 });
  } catch {
    try {
      const cmd = `cd /docker/openclaw-jnqf && docker compose exec -T openclaw openclaw ${args.map((a) => JSON.stringify(a)).join(' ')}`;
      return require('node:child_process').execSync(cmd, { encoding: 'utf8', timeout: 20000 });
    } catch {
      return '';
    }
  }
}

function parseCronFailing(text) {
  if (!text) return 0;
  return text.split(/\r?\n/).filter((l) => /fail|error|stopped|disabled/i.test(l)).length;
}

function parseActiveAgents(text) {
  if (!text) return 0;
  const ids = new Set();
  for (const m of text.match(/agent:([a-zA-Z0-9_\-]+):/g) || []) {
    ids.add(m.replace('agent:', '').replace(':', ''));
  }
  return ids.size;
}

const memory = fs.existsSync(memFile) ? JSON.parse(fs.readFileSync(memFile, 'utf8')) : {};
const cronList = safeOpenclaw(['cron', 'list']);
const statusDeep = safeOpenclaw(['status', '--deep']);

const row = {
  ts: new Date().toISOString(),
  metrics: {
    cronFailing: parseCronFailing(cronList),
    recallFlagged: Number(memory?.observations?.flaggedCount || 0),
    dreamRuns7d: Number(memory?.dreamCycle?.last7Runs || 0),
    activeAgents: parseActiveAgents(statusDeep)
  },
  sources: {
    hasCronList: Boolean(cronList),
    hasStatusDeep: Boolean(statusDeep),
    hasMemoryDash: fs.existsSync(memFile)
  }
};

fs.mkdirSync(outDir, { recursive: true });
fs.appendFileSync(outFile, `${JSON.stringify(row)}\n`);
console.log(`ingested snapshot -> ${outFile}`);
console.log(JSON.stringify(row, null, 2));
