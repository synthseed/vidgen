import { NextResponse } from 'next/server';
import { isApiAuthorized } from '@/lib/api-auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { generateWeeklySummary, readWeeklySummaryArtifact } from '@/lib/weekly-summary';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!isApiAuthorized(request)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const rate = checkRateLimit(request, 'weekly-summary');
  if (!rate.ok) return NextResponse.json({ error: 'rate_limited' }, { status: 429, headers: { 'Retry-After': String(rate.retryAfterSec || 1) } });

  const refresh = new URL(request.url).searchParams.get('refresh') === '1';
  if (refresh) {
    const { summary, artifactPath } = await generateWeeklySummary();
    return NextResponse.json({ ...summary, artifactPath, generated: true });
  }

  const cached = await readWeeklySummaryArtifact();
  if (cached) return NextResponse.json({ ...cached, generated: false });

  const { summary, artifactPath } = await generateWeeklySummary();
  return NextResponse.json({ ...summary, artifactPath, generated: true });
}
