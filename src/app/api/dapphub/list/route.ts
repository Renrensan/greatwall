import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  

  const network = searchParams.get('network'); 
  const walletAddress = searchParams.get('walletAddress'); 

  if (!network) {
    return NextResponse.json(
      { success: false, error: 'Missing network or walletAddress' }, 
      { status: 400 }
    );
  }

  try {
    const walletAddressLink = walletAddress ? `?walletAddress=${walletAddress}` : ``;
    const fullUrl = `${BACKEND_URL}/api/dapphub/list/${network}${walletAddressLink}`;

    const backendRes = await fetch(fullUrl, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store", 
    });

    if (!backendRes.ok) {
      return NextResponse.json(
        { success: false, error: `Backend error: ${backendRes.status}` }, 
        { status: backendRes.status }
      );
    }

    const data = await backendRes.json();
    
    return NextResponse.json(data);

  } catch (err) {
    console.error("[ERROR] GET /api/dapphub/list", err);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' }, 
      { status: 500 }
    );
  }
}