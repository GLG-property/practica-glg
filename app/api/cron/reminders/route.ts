import { NextRequest, NextResponse } from "next/server";
import { processDueNotifications } from "@/lib/notifications/send";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Endpoint apelat de un cron extern (ex: o dată pe oră) pentru a trimite
 * reminderele scadente. Protejat cu CRON_SECRET:
 *   Authorization: Bearer <CRON_SECRET>
 *
 * Exemplu cron (crontab) la fiecare oră:
 *   0 * * * * curl -s -H "Authorization: Bearer $CRON_SECRET" https://APP/api/cron/reminders
 */
async function handle(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const result = await processDueNotifications();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[cron/reminders] error:", err);
    return NextResponse.json({ ok: false, error: "internal" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return handle(req);
}
export async function POST(req: NextRequest) {
  return handle(req);
}
