import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const backendRes = await fetch(`${BACKEND_URL}/api/transaction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const resText = await backendRes.text();
    let data: any;
    try {
      data = JSON.parse(resText);
    } catch {
      data = {
        success: false,
        error: resText || "Backend returned a non-JSON response",
      };
    }

    console.log(data);
    return NextResponse.json(data, { status: backendRes.status });
  } catch (err: any) {
    console.error("[ERROR] POST /api/transaction", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}
