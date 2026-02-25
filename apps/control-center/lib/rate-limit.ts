type Bucket = { tokens: number; lastRefill: number };

const buckets = new Map<string, Bucket>();

function envNumber(name: string, fallback: number) {
  const raw = Number(process.env[name]);
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
}

export function checkRateLimit(request: Request, routeKey: string) {
  const capacity = envNumber('CONTROL_CENTER_RATE_LIMIT_CAPACITY', 60);
  const refillPerSec = envNumber('CONTROL_CENTER_RATE_LIMIT_REFILL_PER_SEC', 1);
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const key = `${routeKey}:${ip}`;
  const now = Date.now();

  const bucket = buckets.get(key) || { tokens: capacity, lastRefill: now };
  const elapsedSec = Math.max(0, (now - bucket.lastRefill) / 1000);
  bucket.tokens = Math.min(capacity, bucket.tokens + elapsedSec * refillPerSec);
  bucket.lastRefill = now;

  if (bucket.tokens < 1) {
    buckets.set(key, bucket);
    return { ok: false, retryAfterSec: Math.ceil((1 - bucket.tokens) / refillPerSec) };
  }

  bucket.tokens -= 1;
  buckets.set(key, bucket);
  return { ok: true, remaining: Math.floor(bucket.tokens) };
}
