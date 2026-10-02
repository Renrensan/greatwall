import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { walletAddress, network, dappId } = body;

    // 1. Quick validation
    if (!walletAddress || !network || dappId === undefined) {
      return NextResponse.json({ success: false, error: 'Missing data' }, { status: 400 });
    }

    // 2. Proxy to the specific backend toggle endpoint
    const backendRes = await fetch(`${BACKEND_URL}/api/dapphub/favorites/toggle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ walletAddress, network, dappId }),
    });

    if (!backendRes.ok) {
      return NextResponse.json({ success: false, error: 'Backend failed' }, { status: backendRes.status });
    }

    const data = await backendRes.json();
    return NextResponse.json(data);

  } catch (err) {
    console.error("[ERROR] POST /api/dapphub/favorite", err);
    return NextResponse.json({ success: false, error: 'Server Error' }, { status: 500 });
  }
}