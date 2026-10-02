import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(request: Request) {
  try {
    const { whatsapp } = await request.json();
    if (!whatsapp) {
      return NextResponse.json({ success: false, error: "WhatsApp number is required" }, { status: 400 });
    }

    const filePath = path.join(process.cwd(), "whatsapp_leads.json");
    let leads = [];

    if (fs.existsSync(filePath)) {
      const fileData = fs.readFileSync(filePath, "utf8");
      try {
        leads = JSON.parse(fileData);
      } catch (e) {
        leads = [];
      }
    }

    leads.push({
      whatsapp,
      timestamp: new Date().toISOString(),
    });

    fs.writeFileSync(filePath, JSON.stringify(leads, null, 2), "utf8");
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
