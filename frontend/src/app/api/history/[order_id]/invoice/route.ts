import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ order_id: string }> }
) {
  try {
    const { order_id } = await params;
    const res = await fetch(`http://localhost:8000/api/history/${order_id}/invoice`, { cache: 'no-store' });
    
    if (!res.ok) {
        return NextResponse.json({ error: "Failed to generate invoice" }, { status: 500 });
    }

    const pdfBuffer = await res.arrayBuffer();

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice_${order_id}.pdf"`,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}
