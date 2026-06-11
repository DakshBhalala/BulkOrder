import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { id } = await request.json();
    const res = await fetch('http://localhost:8000/api/alerts/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    
    if (res.ok) {
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ success: false, error: 'Could not resolve' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Network error' }, { status: 500 });
  }
}
