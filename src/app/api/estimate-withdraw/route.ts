import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const network = searchParams.get("network");
  const token = searchParams.get("token");
  const amount = searchParams.get("amount");
  const env = searchParams.get("env") || "TESTNET";


  if (!network || !token || !amount) {
    return NextResponse.json(
      { success: false, error: "Missing required parameters" },
      { status: 400 },
    );
  }

  try {
    const query = new URLSearchParams({
      network,
      token,
      amount,
      env,
    });

    const backendRes = await fetch(
      `${BACKEND_URL}/api/transaction/estimate-withdraw?${query.toString()}`,
      { cache: "no-cache" },
    );

    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  } catch (err) {
    console.error("[ERROR] GET /api/estimate-withdraw", err);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
