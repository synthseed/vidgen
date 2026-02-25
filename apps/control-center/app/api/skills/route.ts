import { NextResponse } from 'next/server';
import { getOverview } from '@/lib/overview';
import { isApiAuthorized } from '@/lib/api-auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { normalizeRange } from '@/lib/metrics';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!isApiAuthorized(request)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const rate = checkRateLimit(request, 'skills');
  if (!rate.ok) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });

  const range = normalizeRange(new URL(request.url).searchParams.get('range'));
  const overview = await getOverview(range);
  return NextResponse.json({ generatedAt: overview.generatedAt, range, skillOpportunities: overview.skillOpportunities, workflows: overview.workflows });
}
