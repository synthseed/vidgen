#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { redact, stripImperatives } = require('./memory_redaction');

const workspace = process.env.OPENCLAW_WORKSPACE || process.cwd();
const sessionsDir = process.env.SESSIONS_DIR || '/data/.openclaw/agents/main/sessions';
const outDir = path.join(workspace, 'memory/hardened');
const shadow = process.env.HARDENED_MEMORY_SHADOW !== '0';
const outFile = path.join(outDir, shadow ? 'observations.shadow.jsonl' : 'observations.jsonl');

fs.mkdirSync(outDir, { recursive: true });
for (const d of ['archive','quarantine','backups','metrics']) fs.mkdirSync(path.join(outDir,d), { recursive: true });

function latestSession() {
  if (!fs.existsSync(sessionsDir)) return null;
  const files = fs.readdirSync(sessionsDir).filter((f) => f.endsWith('.jsonl') && !/(subagent|cron|topic)/.test(f)).sort();
  if (!files.length) return null;
  return path.join(sessionsDir, files[files.length - 1]);
}

const file = latestSession();
if (!file) { console.log('hardened observer: no session file found'); process.exit(0); }

const lines = fs.readFileSync(file, 'utf8').trim().split(/\r?\n/).slice(-120);
const entries = [];
for (const line of lines) {
  if (!line.trim()) continue;
  try {
    const obj = JSON.parse(line);
    const role = obj?.message?.role;
    if (!['user','assistant','system'].includes(role)) continue;
    const raw = typeof obj?.message?.content === 'string' ? obj.message.content : (Array.isArray(obj?.message?.content) ? obj.message.content.map((x)=>x.text||'').join(' ') : '');
    if (!raw || raw.length < 8) continue;
    const safe = stripImperatives(redact(raw)).slice(0, 500);
    entries.push({
      id: crypto.createHash('sha256').update(`${obj.timestamp||Date.now()}-${safe}`).digest('hex').slice(0, 16),
      timestamp: obj.timestamp || new Date().toISOString(),
      source: { session: path.basename(file, '.jsonl'), role, evidence_ref: path.basename(file) },
      priority: 'medium',
      fact_type: 'context',
      summary: safe,
      tags: ['hardened-memory'],
      trusted: false,
      safety_flags: safe.includes('FLAGGED_UNTRUSTED_CONTENT') ? ['prompt_injection_pattern'] : []
    });
  } catch {}
}

if (!entries.length) { console.log('hardened observer: no entries'); process.exit(0); }
fs.appendFileSync(outFile, entries.map((e)=>JSON.stringify(e)).join('\n') + '\n');
console.log(`hardened observer wrote ${entries.length} entries -> ${outFile}`);
