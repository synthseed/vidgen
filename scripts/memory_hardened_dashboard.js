#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = process.env.OPENCLAW_WORKSPACE || process.cwd();
const base = path.join(root, 'memory/hardened');

function readJsonl(file) {
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean).map((l) => {
    try { return JSON.parse(l); } catch { return null; }
  }).filter(Boolean);
}

function listFiles(dir, prefix = '') {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => (prefix ? f.startsWith(prefix) : true)).sort();
}

const obs = readJsonl(path.join(base, 'observations.jsonl'));
const compact = readJsonl(path.join(base, 'compact.jsonl'));
const flags = obs.filter((e) => Array.isArray(e.safety_flags) && e.safety_flags.length > 0);
const byPriority = obs.reduce((a, e) => { a[e.priority] = (a[e.priority] || 0) + 1; return a; }, {});
const byType = obs.reduce((a, e) => { a[e.fact_type] = (a[e.fact_type] || 0) + 1; return a; }, {});

const metricsDir = path.join(base, 'metrics');
const dreamMetricsFiles = listFiles(metricsDir, 'dream-').slice(-7);
let dreamMetrics = dreamMetricsFiles.map((f) => {
  try { return JSON.parse(fs.readFileSync(path.join(metricsDir, f), 'utf8')); } catch { return null; }
}).filter(Boolean);

const dryRuns = dreamMetrics.filter((m) => m.readOnly === true).length;
const liveRuns = dreamMetrics.filter((m) => m.readOnly === false).length;

const summary = {
  generatedAt: new Date().toISOString(),
  mode: 'active',
  observations: {
    total: obs.length,
    compactTotal: compact.length,
    flaggedCount: flags.length,
    priorityBreakdown: byPriority,
    factTypeBreakdown: byType
  },
  dreamCycle: {
    last7Runs: dreamMetrics.length,
    dryRunCount: dryRuns,
    liveRunCount: liveRuns,
    latest: dreamMetrics[dreamMetrics.length - 1] || null
  },
  recommendation: dryRuns >= 3 ? 'Eligible to switch DREAM_READ_ONLY=0 after reliability_guardian + human approval.' : `Remain in read-only; ${Math.max(0, 3 - dryRuns)} more dry runs needed.`
};

const outPath = path.join(base, 'dashboard.json');
fs.writeFileSync(outPath, JSON.stringify(summary, null, 2));

console.log('Hardened Memory Dashboard');
console.log(`- generatedAt: ${summary.generatedAt}`);
console.log(`- observations.total: ${summary.observations.total}`);
console.log(`- observations.compactTotal: ${summary.observations.compactTotal}`);
console.log(`- observations.flaggedCount: ${summary.observations.flaggedCount}`);
console.log(`- dreamCycle.last7Runs: ${summary.dreamCycle.last7Runs}`);
console.log(`- dreamCycle.dryRunCount: ${summary.dreamCycle.dryRunCount}`);
console.log(`- dreamCycle.liveRunCount: ${summary.dreamCycle.liveRunCount}`);
console.log(`- recommendation: ${summary.recommendation}`);
console.log(`- output: ${outPath}`);
