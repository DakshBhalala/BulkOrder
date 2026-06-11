import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const res = await fetch('http://localhost:8000/api/history/invoice-bundle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    
    if (!res.ok) {
        return NextResponse.json({ error: "Failed to generate invoice bundle" }, { status: 500 });
    }

    const zipBuffer = await res.arrayBuffer();

    return new NextResponse(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="invoices_bundle.zip"',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate ZIP' }, { status: 500 });
  }
}
