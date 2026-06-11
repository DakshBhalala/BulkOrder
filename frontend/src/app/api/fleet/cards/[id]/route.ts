import { NextResponse } from 'next/server';

export async function DELETE(
  request: Request, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const res = await fetch(`http://localhost:8000/api/fleet/cards/${id}`, {
      method: 'DELETE',
    });
    
    if (!res.ok) {
      throw new Error(`Backend error: ${res.status}`);
    }
    
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete card' }, { status: 500 });
  }
}
