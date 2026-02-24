#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const workspace = process.env.OPENCLAW_WORKSPACE || process.cwd();
const base = path.join(workspace, 'memory/hardened');
const src = path.join(base, process.env.HARDENED_MEMORY_SHADOW === '0' ? 'observations.jsonl' : 'observations.shadow.jsonl');
const out = path.join(base, 'compact.jsonl');

if (!fs.existsSync(src)) { console.log('reflector: no source file'); process.exit(0); }
const seen = new Set();
const keep = [];
for (const line of fs.readFileSync(src,'utf8').split(/\r?\n/)) {
  if (!line.trim()) continue;
  try {
    const obj = JSON.parse(line);
    const key = `${obj.fact_type}|${obj.summary}`;
    if (seen.has(key)) continue;
    seen.add(key);
    keep.push(obj);
  } catch {}
}
fs.writeFileSync(out, keep.map((x)=>JSON.stringify(x)).join('\n') + (keep.length?'\n':''));
console.log(`reflector compacted -> ${out} (${keep.length} entries)`);
