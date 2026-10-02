import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

const BACKEND_URL = (process.env.BACKEND_URL?.trim() || "http://127.0.0.1:8000").replace("localhost", "127.0.0.1");

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  console.log(`[COMPARE-FACES ROUTE] Request received at ${new Date().toISOString()}`);

  try {
    const incomingFormData = await req.formData();
    const token = incomingFormData.get("onboardingToken");
    console.log(`[COMPARE-FACES ROUTE] Forwarding to backend: ${BACKEND_URL}/api/auth/onboarding/compare-faces (token: ${token})`);

    const outgoingFormData = new FormData();
    for (const [key, value] of incomingFormData.entries()) {
      if (value instanceof File) {
        const buffer = await value.arrayBuffer();
        const blob = new Blob([buffer], { type: value.type || "application/octet-stream" });
        outgoingFormData.append(key, blob, value.name);
      } else {
        outgoingFormData.append(key, value);
      }
    }

    const backendRes = await fetch(`${BACKEND_URL}/api/auth/onboarding/compare-faces`, {
      method: "POST",
      body: outgoingFormData,
    });

    const duration = Date.now() - startTime;
    console.log(`[COMPARE-FACES ROUTE] Backend responded in ${duration}ms with HTTP status ${backendRes.status}`);

    const contentType = backendRes.headers.get("content-type") || "";
    let data: any;
    if (contentType.includes("application/json")) {
      data = await backendRes.json();
    } else {
      const text = await backendRes.text();
      console.warn(`[COMPARE-FACES ROUTE] Non-JSON response text: "${text}"`);
      data = {
        success: backendRes.ok,
        error: text || "Face comparison failed.",
        message: text || "Face comparison failed.",
      };
    }

    if (!backendRes.ok) {
      console.error(`[COMPARE-FACES ROUTE] Error response payload from Rust backend:`, data);
    }

    return NextResponse.json(data, { status: backendRes.status });
  } catch (err: any) {
    const duration = Date.now() - startTime;
    console.error(`[COMPARE-FACES ROUTE EXCEPTION] Failed after ${duration}ms:`, err, err?.cause);
    return NextResponse.json(
      {
        success: false,
        error: err?.cause?.message || err?.message || "Internal Server Error",
        message: err?.cause?.message || err?.message || "Internal Server Error",
        details: { error: String(err), cause: String(err?.cause) },
      },
      { status: 500 },
    );
  }
}
