import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> } 
) {
  try {
    const { id: transactionId } = await params;

    if (!BACKEND_URL) {
      throw new Error("BACKEND_URL is not defined in environment variables");
    }

    const backendRes = await fetch(`${BACKEND_URL}/api/transaction/${transactionId}/mark-paid`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json' 
      },
    });

    if (!backendRes.ok) {
      const errorData = await backendRes.json();
      return NextResponse.json(
        { success: false, error: errorData.message || 'Update failed' },
        { status: backendRes.status }
      );
    }

    const data = await backendRes.json();
    
    return NextResponse.json({
      success: true,
      data
    });

  } catch (err: any) {
    console.error(`[ERROR] PATCH mark-paid failed:`, err.message);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' }, 
      { status: 500 }
    );
  }
}