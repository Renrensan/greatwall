import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const MARKETING_API_BASE = 
  process.env.MARKETING_SERVICE_URL || 'https://api.paradapp.com/marketing/api/v1/marketing-tasks';

const sanitizePhone = (phone: string): string => {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  }
  return cleaned;
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { whatsapp } = body || {};

    if (!whatsapp || typeof whatsapp !== 'string' || whatsapp.trim() === '') {
      return NextResponse.json({ error: 'WhatsApp phone number is required' }, { status: 400 });
    }

    const cleanPhone = sanitizePhone(whatsapp);
    if (cleanPhone.length < 9 || cleanPhone.length > 15) {
      return NextResponse.json({ error: 'Invalid phone number format' }, { status: 400 });
    }

    const captionText = `Halo! 👋\n\nIni adalah materi onboarding "Memahami Blockchain dari Dasar" dari ParaHub yang Anda minta.\n\nSelamat membaca dan pelajari materinya! 🚀`;

    // Strict Go Worker Task Schema
    const workerPayload = {
      name: "ParaHub Guest", // Placeholder so the Go backend doesn't throw a 500
      phone_number: cleanPhone,
      task_type: 'SEND_PDF',
      payload: {
        text: captionText,
      },
    };

    const response = await fetch(MARKETING_API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(workerPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Marketing worker rejected request: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return NextResponse.json({ success: true, task: data }, { status: 200 });

  } catch (error: any) {
    console.error('[send-materi] Dispatch failure:', error);
    return NextResponse.json(
      { error: 'Failed to dispatch WhatsApp document job. Please try again later.' },
      { status: 500 }
    );
  }
}