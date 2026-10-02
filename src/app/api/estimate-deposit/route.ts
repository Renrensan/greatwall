import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;


  const network = searchParams.get("network");
  const token = searchParams.get("token");
  const idr = searchParams.get("idr");
  const env = searchParams.get("env");
  const paymentMethod = searchParams.get("paymentMethod");
  const channelId = searchParams.get("channelId") || searchParams.get("channel_id");


  const queryObj: Record<string, string> = {};

  if (network) queryObj.network = network;
  if (token) queryObj.token = token;
  if (idr) queryObj.idr = idr;
  if (env) queryObj.env = env;
  if (paymentMethod) queryObj.paymentMethod = paymentMethod;
  if (channelId) queryObj.channelId = channelId;


  const queryString = new URLSearchParams(queryObj).toString();

  let attempts = 0;
  const maxAttempts = 3;
  let lastError: any = null;
  let lastStatus = 500;

  while (attempts < maxAttempts) {
    attempts++;
    try {
      const backendRes = await fetch(
        `${BACKEND_URL}/api/transaction/estimate-deposit?${queryString}`,
        { cache: "no-cache" },
      );

      lastStatus = backendRes.status;

      // If successful or 4xx client validation error, return immediately without retrying
      if (backendRes.status < 500) {
        const data = await backendRes.json();
        return NextResponse.json(data, { status: backendRes.status });
      }

      // If 5xx server error, wait briefly and retry
      if (attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, attempts * 150));
      }
    } catch (err) {
      lastError = err;
      if (attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, attempts * 150));
      }
    }
  }

  console.error("[ERROR] GET /api/estimate-deposit failed after retries:", lastError || lastStatus);
  return NextResponse.json(
    { success: false, error: "Estimation service temporarily unavailable" },
    { status: lastStatus || 500 },
  );
}
