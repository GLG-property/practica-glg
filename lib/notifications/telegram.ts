import "server-only";

/**
 * Modul Telegram. Se activează doar dacă există TELEGRAM_BOT_TOKEN și
 * NOTIFICATIONS_ENABLED=on. Altfel, trimiterea e dezactivată (no-op).
 */
export function telegramEnabled(): boolean {
  return (
    process.env.NOTIFICATIONS_ENABLED === "on" &&
    !!process.env.TELEGRAM_BOT_TOKEN
  );
}

export async function sendTelegram(chatId: string, text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    const json = (await res.json()) as { ok?: boolean };
    return !!json.ok;
  } catch (err) {
    console.error("[telegram] send error:", err);
    return false;
  }
}
