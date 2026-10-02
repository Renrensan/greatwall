import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const backendRes = await fetch(`${BACKEND_URL}/api/auth/onboarding/verify-link`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const contentType = backendRes.headers.get("content-type") || "";
    let data: any;
    if (contentType.includes("application/json")) {
      data = await backendRes.json();
    } else {
      const text = await backendRes.text();
      data = backendRes.ok
        ? { success: true }
        : { success: false, error: text || "Verification failed." };
    }
    return NextResponse.json(data, { status: backendRes.status });
  } catch (err) {
    console.error("[ERROR] POST /api/auth/onboarding/verify-link", err);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
