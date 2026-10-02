
import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL;

export async function GET(_: NextRequest, context: { params: Promise<{ id: string }>}) {
  const { id } = await context.params;  

  if (!id) {
    return NextResponse.json({ success: false, error: 'Missing transaction ID' }, { status: 400 });
  }

  try {
    const backendRes = await fetch(`${BACKEND_URL}/api/transaction/${id}`, {cache: 'no-cache'});
    const data = await backendRes.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("[ERROR] GET /api/transaction/[id]", err);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
