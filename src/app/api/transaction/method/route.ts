import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL;

export async function GET() {
  try {
    const backendRes = await fetch(`${BACKEND_URL}/api/transaction/method`, {
      cache: "no-cache",
    });
    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  } catch (err) {
    console.error("[ERROR] GET /api/transaction/method", err);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
