import { NextResponse } from 'next/server';
import { getOverview } from '@/lib/overview';
import { isApiAuthorized } from '@/lib/api-auth';
import { checkRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!isApiAuthorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const rate = checkRateLimit(request, 'overview');
  if (!rate.ok) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429, headers: { 'Retry-After': String(rate.retryAfterSec || 1) } });
  }

  const { searchParams } = new URL(request.url);
  const range = searchParams.get('range') || '24h';

  try {
    const payload = await getOverview(range);
    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        generatedAt: new Date().toISOString(),
        error: 'overview_unavailable',
        message: String(error)
      },
      { status: 500 }
    );
  }
}
