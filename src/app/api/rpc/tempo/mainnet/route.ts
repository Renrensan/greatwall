import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const url = process.env.TEMPO_MAINNET_RPC_URL;
  if (!url)
    return NextResponse.json(
      { error: "RPC URL NOT PROVIDED" },
      { status: 500 },
    );

  try {
    const body = await request.json();
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return NextResponse.json(await res.json());
  } catch (error) {
    return NextResponse.json({ error: "Proxy Error" }, { status: 500 });
  }
}
