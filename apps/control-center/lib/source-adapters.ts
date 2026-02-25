import { exec, execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import type { FreshnessState } from '@/lib/types';

const execFileAsync = promisify(execFile);
const execAsync = promisify(exec);
const ROOT = process.env.OPENCLAW_WORKSPACE || path.resolve(process.cwd(), '../..');

export type SourceErrorCode = 'timeout' | 'not_found' | 'exec_error' | 'parse_error' | 'io_error';

export type SourceResult<T> = {
  ok: boolean;
  value?: T;
  error?: { code: SourceErrorCode; message: string };
  at: string;
};

export async function runOpenclaw(args: string[], timeoutMs = 15000): Promise<SourceResult<string>> {
  const at = new Date().toISOString();
  try {
    const { stdout } = await execFileAsync('openclaw', args, { timeout: timeoutMs });
    return { ok: true, value: stdout, at };
  } catch (error) {
    try {
      const cmd = `cd /docker/openclaw-jnqf && docker compose exec -T openclaw openclaw ${args.map((a) => JSON.stringify(a)).join(' ')}`;
      const { stdout } = await execAsync(cmd, { timeout: timeoutMs + 5000 });
      return { ok: true, value: stdout, at };
    } catch (fallbackError) {
      const message = String(fallbackError);
      const code: SourceErrorCode = /timed?\s*out|timeout/i.test(message)
        ? 'timeout'
        : /ENOENT|not found/i.test(message)
          ? 'not_found'
          : 'exec_error';
      return { ok: false, error: { code, message }, at };
    }
  }
}

export async function readJsonFile<T>(filePath: string): Promise<SourceResult<T>> {
  const at = new Date().toISOString();
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return { ok: true, value: JSON.parse(raw), at };
  } catch (error) {
    const message = String(error);
    const code: SourceErrorCode = /Unexpected token|JSON/.test(message) ? 'parse_error' : 'io_error';
    return { ok: false, error: { code, message }, at };
  }
}

export function workspacePath(...parts: string[]) {
  return path.join(ROOT, ...parts);
}

export function freshnessFromTs(ts?: string | null): FreshnessState {
  if (!ts) return 'unknown';
  const ms = Date.now() - new Date(ts).getTime();
  if (!Number.isFinite(ms) || ms < 0) return 'unknown';
  if (ms <= 10 * 60 * 1000) return 'live';
  if (ms <= 60 * 60 * 1000) return 'stale';
  return 'outdated';
}
