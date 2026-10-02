import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> } 
) {
  try {
    const { id: transactionId } = await params;

    if (!BACKEND_URL) {
      throw new Error("BACKEND_URL is not defined in environment variables");
    }

    const body = await req.json().catch(() => ({}));

    const backendRes = await fetch(`${BACKEND_URL}/api/transaction/${transactionId}/cancel`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify(body),
    });

    const data = await backendRes.json().catch(() => ({}));

    if (!backendRes.ok) {
      return NextResponse.json(
        { success: false, error: data.error || data.message || 'Cancellation failed' },
        { status: backendRes.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: data.message || 'Transaction cancelled successfully',
      data
    });

  } catch (err: any) {
    console.error(`[ERROR] POST cancel failed:`, err.message);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' }, 
      { status: 500 }
    );
  }
}
