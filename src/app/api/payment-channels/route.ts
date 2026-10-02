import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL;

export async function GET(_req: NextRequest) {
  try {
    const backendRes = await fetch(
      `${BACKEND_URL}/api/transaction/payment-channels`,
      { cache: "no-cache" },
    );

    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  } catch (err) {
    console.error("[ERROR] GET /api/payment-channels", err);
    // Fallback channels if backend is unreachable
    return NextResponse.json([
      {
        code: "INA",
        name: "Bank INA",
        method: "va",
        feeType: "fixed",
        feeValue: 3000,
        feeDirection: "added_on_top",
      },
      {
        code: "QRIS",
        name: "QRIS",
        method: "qris",
        feeType: "percent",
        feeValue: 0.7,
        feeDirection: "deducted",
      },
    ]);
  }
}
