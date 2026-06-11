import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const res = await fetch('http://localhost:8000/api/campaigns', { cache: 'no-store' });
    const campaigns = await res.json();
    return NextResponse.json({ campaigns });
  } catch (error) {
    return NextResponse.json({ campaigns: [] });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const res = await fetch('http://localhost:8000/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const newCampaign = await res.json();
    return NextResponse.json({ success: true, campaign: newCampaign });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to connect to Python backend' }, { status: 500 });
  }
}
