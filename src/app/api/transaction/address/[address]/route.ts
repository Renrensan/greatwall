import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL;

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ address: string }> },
) {
  const { address } = await context.params;

  if (!address) {
    return NextResponse.json(
      { success: false, error: "Missing address" },
      { status: 400 },
    );
  }

  try {
    const [backendRes, refBackendRes] = await Promise.all([
      fetch(`${BACKEND_URL}/api/transaction/address/${address}`, {
        cache: "no-cache",
      }),
      fetch(`${BACKEND_URL}/api/transaction/ref-address/${address}`, {
        cache: "no-cache",
      }),
    ]);

    const [data, refData] = await Promise.all([
      backendRes.json(),
      refBackendRes.json(),
    ]);

    return NextResponse.json({ data, refData });
  } catch (err) {
    console.error("[ERROR] GET /api/transaction/address/[address]", err);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
