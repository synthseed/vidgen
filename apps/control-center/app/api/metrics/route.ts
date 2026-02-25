import { NextResponse } from 'next/server';
import { readMetricHistory } from '@/lib/metrics';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get('limit') || 120);
  const data = await readMetricHistory(Number.isFinite(limit) ? limit : 120);
  return NextResponse.json({ generatedAt: new Date().toISOString(), points: data });
}
