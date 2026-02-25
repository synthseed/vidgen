import { NextResponse } from 'next/server';
import { getCronDrilldown } from '@/lib/drilldowns';
import { isApiAuthorized } from '@/lib/api-auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { normalizeRange } from '@/lib/metrics';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!isApiAuthorized(request)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const rate = checkRateLimit(request, 'cron');
  if (!rate.ok) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });

  const range = normalizeRange(new URL(request.url).searchParams.get('range'));
  return NextResponse.json(await getCronDrilldown(range));
}
