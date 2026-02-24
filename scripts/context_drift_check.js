#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function main() {
  const errors = [];
  const warnings = [];

  const opsDocs = [
    'docs/ops/openclaw-runtime-hardening.md',
    'docs/ops/openclaw-branch-promotion.md',
    'docs/ops/openclaw-autonomy-run-protocol.md',
    'docs/ops/supervised-run-checklist.md',
    'docs/ops/hardened-memory-module.md'
  ];

  for (const doc of opsDocs) {
    if (!exists(doc)) errors.push(`missing required ops doc: ${doc}`);
  }

  if (exists('docs/ops/openclaw-autonomy-run-protocol.md')) {
    const t = read('docs/ops/openclaw-autonomy-run-protocol.md');
    for (const h of ['## Supervised Run Sequence', '## Failure Handling', '## Self-Heal + Learning Loop']) {
      if (!t.includes(h)) errors.push(`openclaw-autonomy-run-protocol.md missing heading: ${h}`);
    }
  }

  const topo = JSON.parse(read('openclaw/openclaw.json'));
  const roles = (topo.agents?.list || []).map((a) => a.id);
  const requiredMemHeadings = [
    '## Purpose', '## Memory Contract', '## Memory Model', '## Semantic Memory',
    '## Procedural Memory', '## Episodic Memory', '## Compaction Rules',
    '## Update Cadence', '## Role-Specific Capture Checklist'
  ];

  for (const role of roles) {
    const base = `openclaw/workspace-templates/${role}`;
    for (const f of ['AGENTS.md', 'SOUL.md', 'IDENTITY.md', 'MEMORY.md']) {
      const p = `${base}/${f}`;
      if (!exists(p)) errors.push(`missing role template file: ${p}`);
    }
    const mem = `${base}/MEMORY.md`;
    if (exists(mem)) {
      const t = read(mem);
      for (const h of requiredMemHeadings) {
        if (!t.includes(h)) errors.push(`${mem}: missing heading ${h}`);
      }
    }
  }

  const requiredMemoryArtifacts = [
    'schemas/memory-entry.schema.json',
    'scripts/memory_hardened_observer.js',
    'scripts/memory_hardened_reflector.js',
    'scripts/memory_hardened_recovery.js',
    'scripts/memory_hardened_watcher.sh',
    'scripts/memory_hardened_phase2_enable.sh',
    'scripts/memory_redaction.js',
    'scripts/memory_schema_validate.js',
    'memory/README.md',
    'config/hardened-memory/cron-observer.json',
    'config/hardened-memory/cron-reflector.json',
    'config/hardened-memory/cron-recovery.json',
    'config/hardened-memory/memory-flush-snippet.json'
  ];
  for (const rel of requiredMemoryArtifacts) {
    if (!exists(rel)) errors.push(`missing hardened memory artifact: ${rel}`);
  }

  // drift flags for workflow architecture
  const wf = read('.github/workflows/autonomous-pipeline.yml');
  if (!wf.includes('failure_feedback')) {
    warnings.push('autonomous-pipeline.yml missing failure_feedback job (self-heal signal reduced)');
  }

  console.log('Context Drift Check');
  console.log(`- roles_checked: ${roles.length}`);
  console.log(`- errors: ${errors.length}`);
  console.log(`- warnings: ${warnings.length}`);

  if (warnings.length) {
    console.log('\nWarnings:');
    for (const w of warnings) console.log(`- ${w}`);
  }

  if (errors.length) {
    console.error('\nErrors:');
    for (const e of errors) console.error(`- ${e}`);
    process.exit(1);
  }

  console.log('Context drift checks passed.');
}

main();
