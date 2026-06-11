import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const res = await fetch('http://localhost:8000/api/history', { cache: 'no-store' });
    const history = await res.json();
    return NextResponse.json({ history });
  } catch (error) {
    return NextResponse.json({ history: [] });
  }
}
