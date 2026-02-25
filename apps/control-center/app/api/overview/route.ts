import { NextResponse } from 'next/server';
import { getOverview } from '@/lib/overview';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
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
