#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const target = process.argv[2] || path.join(process.cwd(), 'memory/hardened/observations.shadow.jsonl');
if (!fs.existsSync(target)) {
  console.log(`memory schema validate: file not found (${target}), skip`);
  process.exit(0);
}

let lineNo = 0;
for (const line of fs.readFileSync(target, 'utf8').split(/\r?\n/)) {
  if (!line.trim()) continue;
  lineNo += 1;
  let obj;
  try { obj = JSON.parse(line); } catch { console.error(`invalid json at line ${lineNo}`); process.exit(1); }
  const req = ['id','timestamp','source','priority','fact_type','summary','trusted'];
  for (const k of req) {
    if (!(k in obj)) { console.error(`missing ${k} at line ${lineNo}`); process.exit(1); }
  }
  if (typeof obj.summary !== 'string' || obj.summary.length < 3) {
    console.error(`invalid summary at line ${lineNo}`); process.exit(1);
  }
}

console.log('memory schema validation passed');
