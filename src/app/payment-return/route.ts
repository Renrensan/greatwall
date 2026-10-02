import { NextRequest, NextResponse } from "next/server";

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Private-Network": "true",
    },
  });
}

export async function GET(req: NextRequest) {
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Payment Session</title>
  <style>
    body { font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #121212; color: white; }
  </style>
</head>
<body>
  <div style="text-align: center;">
    <p style="font-size: 14px; opacity: 0.8;">Memuat ulang pembayaran...</p>
    <script>
      try {
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({ type: "PARADAPP_RELOAD_PAYMENT_URL", url: window.location.href }, "*");
        } else {
          window.location.href = "/";
        }
      } catch (e) {
        console.error(e);
      }
    </script>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Private-Network": "true",
      "Content-Security-Policy": "frame-ancestors *",
    },
  });
}
