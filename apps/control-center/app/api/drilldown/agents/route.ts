import { NextResponse } from 'next/server';
import { isApiAuthorized } from '@/lib/api-auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { getAgentsDrilldown } from '@/lib/drilldowns';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!isApiAuthorized(request)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const rate = checkRateLimit(request, 'drilldown-agents');
  if (!rate.ok) return NextResponse.json({ error: 'rate_limited' }, { status: 429, headers: { 'Retry-After': String(rate.retryAfterSec || 1) } });

  const range = new URL(request.url).searchParams.get('range') || '7d';
  const data = await getAgentsDrilldown(range);
  return NextResponse.json(data);
}
