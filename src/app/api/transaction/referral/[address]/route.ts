
import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL;

export async function GET(req: NextRequest, context: { params: Promise<{ address: string }> }) {
  const { address } = await context.params;  

  if (!address) {
    return NextResponse.json({ success: false, error: 'Missing address' }, { status: 400 });
  }

  try {
    const backendRes = await fetch(`${BACKEND_URL}/api/transaction/referral/${address}`, {cache:"no-cache"});
    const data = await backendRes.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("[ERROR] GET /api/transaction/referral/[address]", err);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
