import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL;

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const token = searchParams.get("token");
  const env = searchParams.get("env");

  if (!token) {
    return NextResponse.json(
      { success: false, error: "Missing token" },
      { status: 400 },
    );
  }

  try {
    const backendUrl = new URL(`${BACKEND_URL}/api/transaction/token-price/${token}`);
    if (env) backendUrl.searchParams.set("env", env);

    const backendRes = await fetch(backendUrl.toString(), {
      cache: "no-cache",
    });

    const data = await backendRes.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("[ERROR] GET /api/price", err);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 },
    );
  }
}