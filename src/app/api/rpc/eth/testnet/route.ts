import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const url = process.env.ETH_TESTNET_RPC_URL;
  if (!url)
    return NextResponse.json(
      { error: "RPC URL NOT PROVIDED" },
      { status: 500 },
    );

  try {
    const body = await request.json();

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.text();
      return NextResponse.json(
        { error: "Google RPC Error", details: errorData },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Testnet Proxy Error:", error);
    return NextResponse.json(
      { error: "Internal RPC Proxy Error" },
      { status: 500 },
    );
  }
}
