import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL;

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const network = searchParams.get("network");
  const networkEnv = searchParams.get("env");

  if (!network) {
    return NextResponse.json(
      { success: false, error: "Missing network" },
      { status: 400 },
    );
  }

  try {
    const backendRes = await fetch(
      `${BACKEND_URL}/api/transaction/constraints/${network}?env=${networkEnv}`,
      {
        cache: "no-cache",
      },
    );

    const data = await backendRes.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("[ERROR] GET /api/transaction/constraints", err);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 },
    );
  }
}