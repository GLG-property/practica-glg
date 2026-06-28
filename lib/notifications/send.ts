import "server-only";
import { getAdminClient } from "@/lib/supabase/admin";
import { sendTelegram, telegramEnabled } from "@/lib/notifications/telegram";
import { sendViber, viberEnabled } from "@/lib/notifications/viber";

/**
 * Procesează notificările `pending` care trebuie trimise acum (scheduled_for <= now).
 * Apelat de endpoint-ul de cron. Notificările `inapp` rămân în DB (le citește UI-ul),
 * deci le marcăm direct ca trimise.
 */
export async function processDueNotifications(): Promise<{
  processed: number;
  sent: number;
  failed: number;
}> {
  const supabase = getAdminClient();
  const nowIso = new Date().toISOString();

  const { data: due, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("status", "pending")
    .or(`scheduled_for.is.null,scheduled_for.lte.${nowIso}`)
    .limit(200);

  if (error) throw error;
  const rows = due ?? [];

  let sent = 0;
  let failed = 0;

  for (const n of rows) {
    let ok = false;

    if (n.channel === "inapp") {
      ok = true; // rămâne în aplicație
    } else if (n.channel === "telegram" && n.recipient) {
      ok = telegramEnabled() ? await sendTelegram(n.recipient, n.body ?? "") : false;
    } else if (n.channel === "viber" && n.recipient) {
      ok = viberEnabled() ? await sendViber(n.recipient, n.body ?? "") : false;
    }

    await supabase
      .from("notifications")
      .update({
        status: ok ? "sent" : "failed",
        sent_at: ok ? new Date().toISOString() : null,
      })
      .eq("id", n.id);

    if (ok) sent++;
    else failed++;
  }

  return { processed: rows.length, sent, failed };
}
