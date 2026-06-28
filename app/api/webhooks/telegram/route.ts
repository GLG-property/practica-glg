import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { sendTelegram } from "@/lib/notifications/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Webhook Telegram. Cursantul pornește botul și trimite codul de legare
 * afișat în aplicație. Aici găsim cursantul după cod și salvăm `telegram_chat_id`.
 *
 * Setarea webhook-ului (o singură dată):
 *   https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://APP/api/webhooks/telegram
 */
export async function POST(req: NextRequest) {
  try {
    const update = await req.json();
    const message = update?.message;
    const chatId = message?.chat?.id;
    const text: string = (message?.text ?? "").trim();
    if (!chatId) return NextResponse.json({ ok: true });

    // Acceptăm „/start 123456" sau direct „123456".
    const code = text.replace(/^\/start\s*/, "").trim();
    if (!/^\d{6}$/.test(code)) {
      await sendTelegram(
        String(chatId),
        "Trimite codul de legare din aplicația GLG Property (6 cifre)."
      );
      return NextResponse.json({ ok: true });
    }

    const supabase = getAdminClient();
    const { data: student } = await supabase
      .from("students")
      .select("id, full_name")
      .eq("link_code", code)
      .single();

    if (!student) {
      await sendTelegram(String(chatId), "Cod invalid sau expirat.");
      return NextResponse.json({ ok: true });
    }

    await supabase
      .from("students")
      .update({ telegram_chat_id: String(chatId), link_code: null })
      .eq("id", student.id);

    await sendTelegram(
      String(chatId),
      `Gata, ${student.full_name}! Vei primi remindere pentru lecțiile tale. ✅`
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[webhooks/telegram] error:", err);
    return NextResponse.json({ ok: true }); // răspundem 200 ca Telegram să nu reîncerce la nesfârșit
  }
}
