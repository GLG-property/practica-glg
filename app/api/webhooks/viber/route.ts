import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { sendViber } from "@/lib/notifications/viber";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Webhook Viber. Cursantul scrie botului codul de legare (6 cifre).
 * Salvăm `viber_id` (id-ul utilizatorului Viber) pentru remindere.
 *
 * Setarea webhook-ului: POST https://chatapi.viber.com/pa/set_webhook
 *   { "url": "https://APP/api/webhooks/viber", "event_types": ["message"] }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Viber trimite event "message" cu sender.id și message.text.
    if (body?.event !== "message") return NextResponse.json({ status: 0 });

    const viberId = body?.sender?.id as string | undefined;
    const text: string = (body?.message?.text ?? "").trim();
    if (!viberId) return NextResponse.json({ status: 0 });

    const code = text.trim();
    if (!/^\d{6}$/.test(code)) {
      await sendViber(viberId, "Trimite codul de legare din aplicația GLG Property (6 cifre).");
      return NextResponse.json({ status: 0 });
    }

    const supabase = getAdminClient();
    const { data: student } = await supabase
      .from("students")
      .select("id, full_name")
      .eq("link_code", code)
      .single();

    if (!student) {
      await sendViber(viberId, "Cod invalid sau expirat.");
      return NextResponse.json({ status: 0 });
    }

    await supabase
      .from("students")
      .update({ viber_id: viberId, link_code: null })
      .eq("id", student.id);

    await sendViber(viberId, `Gata, ${student.full_name}! Vei primi remindere pentru lecțiile tale. ✅`);
    return NextResponse.json({ status: 0 });
  } catch (err) {
    console.error("[webhooks/viber] error:", err);
    return NextResponse.json({ status: 0 });
  }
}
