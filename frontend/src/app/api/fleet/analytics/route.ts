import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const res = await fetch('http://localhost:8000/api/fleet/analytics', { cache: 'no-store' });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ proxy_metrics: [], velocity_alerts: [], captcha_balance: -1 }, { status: 500 });
  }
}
