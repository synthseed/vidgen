#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const ROOT = process.env.OPENCLAW_WORKSPACE || '/data/repos/vidgen';
const BASE_URL = process.env.CONTROL_CENTER_BASE_URL || 'http://127.0.0.1:3210/control-center';
const UPDATE = process.env.UPDATE_VISUAL_BASELINES === '1';
const OUT_DIR = path.join(ROOT, 'apps/control-center/data/ingest/visual-baselines');
const routes = ['/','/cron','/agents','/connections'];

function normalize(html) {
  return html
    .replace(/Updated\s[^<]+/g, 'Updated <normalized>')
    .replace(/\d{1,2}\/\d{1,2}\/\d{2,4},?\s\d{1,2}:\d{2}:\d{2}?\s?[AP]M?/g, '<time>')
    .replace(/\s+/g, ' ')
    .trim();
}

function digest(value) {
  return createHash('sha256').update(value).digest('hex');
}

await fs.mkdir(OUT_DIR, { recursive: true });
let failures = 0;
for (const route of routes) {
  const url = `${BASE_URL}${route === '/' ? '' : route}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`FAIL ${route}: HTTP ${res.status}`);
    failures++;
    continue;
  }

  const html = normalize(await res.text());
  const hash = digest(html);
  const baselineFile = path.join(OUT_DIR, `${route === '/' ? 'control-center' : route.slice(1)}.sha256`);

  let baseline = '';
  try { baseline = (await fs.readFile(baselineFile, 'utf8')).trim(); } catch {}

  if (!baseline || UPDATE) {
    await fs.writeFile(baselineFile, `${hash}\n`, 'utf8');
    console.log(`UPDATED ${route} -> ${baselineFile}`);
    continue;
  }

  if (baseline !== hash) {
    console.error(`REGRESSION ${route}: ${baseline.slice(0, 12)} != ${hash.slice(0, 12)}`);
    failures++;
  } else {
    console.log(`OK ${route}`);
  }
}

if (failures > 0) process.exit(1);
