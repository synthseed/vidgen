#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const workspace = process.env.OPENCLAW_WORKSPACE || process.cwd();
const base = path.join(workspace, 'memory/hardened');
const src = path.join(base, process.env.HARDENED_MEMORY_SHADOW === '0' ? 'observations.jsonl' : 'observations.shadow.jsonl');
const archiveDir = path.join(base, 'archive');
const metricsDir = path.join(base, 'metrics');
const logDir = path.join(base, 'dream-logs');
const readOnly = (process.env.DREAM_READ_ONLY || '1') !== '0';

for (const d of [archiveDir, metricsDir, logDir]) fs.mkdirSync(d, { recursive: true });
if (!fs.existsSync(src)) {
  console.log('dream-cycle: no source observations file, skip');
  process.exit(0);
}

const lines = fs.readFileSync(src, 'utf8').split(/\r?\n/).filter(Boolean);
const entries = lines.map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);

const now = new Date();
const stamp = now.toISOString().replace(/[:.]/g,'-');
const low = entries.filter((e) => (e.priority === 'low' || e.priority === 'medium') && !(e.safety_flags||[]).includes('prompt_injection_pattern'));
const keep = entries.filter((e) => !low.includes(e));

function inc(map, key) {
  map[key] = (map[key] || 0) + 1;
}

function phase2CategoryFor(entry) {
  if (entry.phase2Category) return String(entry.phase2Category);
  if (entry.phase2_category) return String(entry.phase2_category);
  if (entry.category) return String(entry.category);
  const tags = Array.isArray(entry.tags) ? entry.tags : [];
  const tagged = tags.find((t) => /^phase2:/.test(String(t)) || /^category:/.test(String(t)) || /^cat:/.test(String(t)));
  if (tagged) return String(tagged).replace(/^(phase2:|category:|cat:)/, '');
  if (entry.fact_type) return `fact_type:${entry.fact_type}`;
  if (entry.source && entry.source.role) return `source_role:${entry.source.role}`;
  return 'uncategorized';
}

const typeBreakdown = {};
const phase2CategoryBreakdown = {};
for (const e of entries) {
  inc(typeBreakdown, String(e.fact_type || 'unknown'));
  inc(phase2CategoryBreakdown, phase2CategoryFor(e));
}

const report = {
  runAt: now.toISOString(),
  model: process.env.DREAM_MODEL || 'openai/gpt-5.2',
  dreamPhase: 2,
  runSource: process.env.DREAM_RUN_SOURCE || 'manual',
  readOnly,
  sourceCount: entries.length,
  archiveCandidateCount: low.length,
  retainCount: keep.length,
  typeBreakdown,
  phase2CategoryBreakdown,
  usage: {
    providerCalls: 0,
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    estimatedCostUsd: 0,
    note: 'Current dream cycle implementation is rule-based and does not invoke LLM APIs.'
  }
};

fs.writeFileSync(path.join(metricsDir, `dream-${stamp}.json`), JSON.stringify(report, null, 2));
fs.writeFileSync(path.join(logDir, `dream-${stamp}.md`), `# Dream Cycle\n\n- runAt: ${report.runAt}\n- model: ${report.model}\n- dreamPhase: ${report.dreamPhase}\n- runSource: ${report.runSource}\n- readOnly: ${report.readOnly}\n- sourceCount: ${report.sourceCount}\n- archiveCandidateCount: ${report.archiveCandidateCount}\n- retainCount: ${report.retainCount}\n`);

if (readOnly) {
  console.log(`dream-cycle dry run: candidates=${low.length}, retain=${keep.length}`);
  process.exit(0);
}

const archivePath = path.join(archiveDir, `dream-archive-${stamp}.jsonl`);
fs.writeFileSync(archivePath, low.map((x)=>JSON.stringify(x)).join('\n') + (low.length?'\n':''));
fs.writeFileSync(src, keep.map((x)=>JSON.stringify(x)).join('\n') + (keep.length?'\n':''));
console.log(`dream-cycle live: archived=${low.length}, retained=${keep.length}`);
