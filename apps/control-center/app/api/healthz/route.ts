import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      service: 'control-center',
      now: new Date().toISOString(),
      uptimeSec: Math.round(process.uptime()),
      nodeEnv: process.env.NODE_ENV || 'unknown',
      basePath: process.env.CONTROL_CENTER_BASE_PATH || '/control-center'
    },
    { status: 200 }
  );
}
