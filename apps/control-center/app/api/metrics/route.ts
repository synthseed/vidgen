import { NextResponse } from 'next/server';
import { readMetricHistory, normalizeRange, normalizeResolution } from '@/lib/metrics';
import { isApiAuthorized } from '@/lib/api-auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { freshnessFromTs } from '@/lib/source-adapters';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!isApiAuthorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const rate = checkRateLimit(request, 'metrics');
  if (!rate.ok) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429, headers: { 'Retry-After': String(rate.retryAfterSec || 1) } });
  }

  const { searchParams } = new URL(request.url);
  const range = normalizeRange(searchParams.get('range'));
  const resolution = normalizeResolution(searchParams.get('resolution'), range);

  const data = await readMetricHistory({ range, resolution });
  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    range,
    resolution,
    source: data.source,
    sampleCount: data.sampleCount,
    freshness: freshnessFromTs(data.freshnessTs),
    points: data.points
  });
}
