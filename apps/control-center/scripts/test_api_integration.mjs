#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const APP_DIR = new URL('../', import.meta.url).pathname;
const PORT = process.env.TEST_PORT || '3310';
const BASE = `http://127.0.0.1:${PORT}/control-center`;

async function waitFor(url, timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.status < 500) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`timeout waiting for ${url}`);
}

async function startServer(workspace) {
  const distDir = path.join(APP_DIR, '.next-local-test');
  await mkdir(distDir, { recursive: true });

  const child = spawn('npm', ['run', 'dev', '--', '-p', PORT], {
    cwd: APP_DIR,
    stdio: 'ignore',
    env: {
      ...process.env,
      CONTROL_CENTER_BASE_PATH: '/control-center',
      CONTROL_CENTER_DIST_DIR: distDir,
      CONTROL_CENTER_API_TOKEN: 'test-token',
      CONTROL_CENTER_RATE_LIMIT_CAPACITY: '1',
      CONTROL_CENTER_RATE_LIMIT_REFILL_PER_SEC: '0.1',
      OPENCLAW_WORKSPACE: workspace
    }
  });

  await waitFor(`${BASE}/api/healthz`);
  return child;
}

let child;
let workspace;

test.before(async () => {
  workspace = await mkdtemp(path.join(tmpdir(), 'cc-test-'));
  await mkdir(path.join(workspace, 'apps/control-center/data/ingest'), { recursive: true });
  await writeFile(path.join(workspace, 'apps/control-center/data/ingest/snapshots.jsonl'), '', 'utf8');
  child = await startServer(workspace);
});

test.after(async () => {
  if (child && !child.killed) {
    child.kill('SIGTERM');
    await new Promise((resolve) => setTimeout(resolve, 1000));
    if (!child.killed) child.kill('SIGKILL');
  }
  if (workspace) await rm(workspace, { recursive: true, force: true });
});

test('api auth rejects missing bearer token', async () => {
  const res = await fetch(`${BASE}/api/overview`);
  assert.equal(res.status, 401);
});

test('api auth accepts valid bearer token', async () => {
  const res = await fetch(`${BASE}/api/overview`, { headers: { authorization: 'Bearer test-token' } });
  assert.equal(res.status, 200);
});

test('rate limit returns 429 after capacity exceeded', async () => {
  const headers = { authorization: 'Bearer test-token', 'x-forwarded-for': '203.0.113.10' };
  const first = await fetch(`${BASE}/api/metrics`, { headers });
  assert.equal(first.status, 200);
  const second = await fetch(`${BASE}/api/metrics`, { headers });
  assert.equal(second.status, 429);
});

test('fallback semantics return partial payload when sources are unavailable', async () => {
  const res = await fetch(`${BASE}/api/overview`, { headers: { authorization: 'Bearer test-token', 'x-forwarded-for': '203.0.113.12' } });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(typeof body.fallbackUsed, 'boolean');
  assert.equal(body.fallbackUsed, true);
  assert.ok(Array.isArray(body.sourceHealth));
  assert.ok(body.sourceHealth.some((s) => s.state === 'degraded' || s.state === 'error'));
});
