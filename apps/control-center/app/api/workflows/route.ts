import { NextResponse } from 'next/server';
import { isApiAuthorized } from '@/lib/api-auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { getOverview } from '@/lib/overview';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!isApiAuthorized(request)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const rate = checkRateLimit(request, 'workflows');
  if (!rate.ok) return NextResponse.json({ error: 'rate_limited' }, { status: 429, headers: { 'Retry-After': String(rate.retryAfterSec || 1) } });

  const data = await getOverview('24h');
  return NextResponse.json({ generatedAt: new Date().toISOString(), workflows: data.workflows });
}
