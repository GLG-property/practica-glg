import "server-only";

/**
 * Modul Viber. Se activează doar dacă există VIBER_BOT_TOKEN și
 * NOTIFICATIONS_ENABLED=on. Altfel, trimiterea e dezactivată (no-op).
 */
export function viberEnabled(): boolean {
  return (
    process.env.NOTIFICATIONS_ENABLED === "on" && !!process.env.VIBER_BOT_TOKEN
  );
}

export async function sendViber(receiverId: string, text: string): Promise<boolean> {
  const token = process.env.VIBER_BOT_TOKEN;
  if (!token) return false;
  try {
    const res = await fetch("https://chatapi.viber.com/pa/send_message", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Viber-Auth-Token": token,
      },
      body: JSON.stringify({
        receiver: receiverId,
        type: "text",
        sender: { name: "GLG Property" },
        text,
      }),
    });
    const json = (await res.json()) as { status?: number };
    // status === 0 înseamnă succes la Viber.
    return json.status === 0;
  } catch (err) {
    console.error("[viber] send error:", err);
    return false;
  }
}
