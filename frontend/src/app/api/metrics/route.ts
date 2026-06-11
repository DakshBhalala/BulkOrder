import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const resMetrics = await fetch('http://localhost:8000/api/metrics', { cache: 'no-store' });
    const metrics = await resMetrics.json();

    const resAlerts = await fetch('http://localhost:8000/api/alerts', { cache: 'no-store' });
    const alerts = await resAlerts.json();

    return NextResponse.json({ metrics, alerts });
  } catch (error) {
    return NextResponse.json({ 
      metrics: {
        supercoinsApplied: 0, loginRatio: 0, loggedIn: 0, failed: 0, availableCoins: 0, giftVouchers: 0
      },
      alerts: []
    });
  }
}
