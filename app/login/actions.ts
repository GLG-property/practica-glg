"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { getAdminClient } from "@/lib/supabase/admin";
import { verifyCode, isValidCodeFormat } from "@/lib/auth/code";
import { createSession } from "@/lib/auth/session";
import { audit } from "@/lib/db/audit";
import type { User, UserRole } from "@/lib/db/types";

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

export type LoginResult =
  | { ok: true; role: UserRole }
  | { ok: false; reason: "wrong"; attemptsLeft: number }
  | { ok: false; reason: "locked"; minutes: number }
  | { ok: false; reason: "invalid" }
  | { ok: false; reason: "config" } // lipsesc variabilele de mediu pe server
  | { ok: false; reason: "error" };

const schema = z.object({
  role: z.enum(["admin", "operator", "instructor"]),
  code: z.string().regex(/^\d{4,8}$/),
});

/** IP-ul clientului (din anteturile de proxy), ca cheie pentru throttling. */
async function clientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return h.get("x-real-ip") || "unknown";
}

/**
 * Autentificare prin rol + cod numeric, cu anti brute-force SERVER-SIDE
 * (tabela login_attempts, cheie ip+rol). Cookie-ul nu mai e granița de securitate.
 */
export async function loginAction(input: { role: UserRole; code: string }): Promise<LoginResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  const { role, code } = parsed.data;
  if (!isValidCodeFormat(code, role)) return { ok: false, reason: "invalid" };

  // Configurare server: dacă lipsesc variabilele de mediu, spunem clar (nu eroare generică).
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY ||
    !process.env.SESSION_SECRET ||
    process.env.SESSION_SECRET.length < 16
  ) {
    return { ok: false, reason: "config" };
  }

  try {
    return await doLogin(role, code);
  } catch (err) {
    console.error("[loginAction]", err);
    return { ok: false, reason: "error" };
  }
}

async function doLogin(role: UserRole, code: string): Promise<LoginResult> {
  const supabase = getAdminClient();
  const ip = await clientIp();

  // 1) Stare throttling pentru (ip, rol).
  const { data: attemptRow } = await supabase
    .from("login_attempts")
    .select("fail_count, locked_until")
    .eq("ip", ip)
    .eq("role", role)
    .maybeSingle();

  const now = Date.now();
  const lockedUntil = attemptRow?.locked_until ? new Date(attemptRow.locked_until).getTime() : 0;
  if (lockedUntil > now) {
    return { ok: false, reason: "locked", minutes: Math.ceil((lockedUntil - now) / 60000) };
  }
  // Dacă blocarea a expirat, repornim contorul.
  const baseCount = lockedUntil && lockedUntil <= now ? 0 : attemptRow?.fail_count ?? 0;

  // 2) Căutăm utilizatorul activ al rolului al cărui cod se potrivește.
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("role", role)
    .eq("active", true);
  if (error) return { ok: false, reason: "invalid" };

  let matched: User | null = null;
  for (const u of (data as User[]) ?? []) {
    if (await verifyCode(code, u.code_hash)) {
      matched = u;
      break;
    }
  }

  if (!matched) {
    const count = baseCount + 1;
    const willLock = count >= MAX_ATTEMPTS;
    await supabase.from("login_attempts").upsert(
      {
        ip,
        role,
        fail_count: count,
        locked_until: willLock ? new Date(now + LOCK_MINUTES * 60000).toISOString() : null,
        updated_at: new Date(now).toISOString(),
      },
      { onConflict: "ip,role" }
    );
    if (willLock) {
      await audit({ userId: null, action: "auth.locked", entity: "login", details: { ip, role } });
      return { ok: false, reason: "locked", minutes: LOCK_MINUTES };
    }
    return { ok: false, reason: "wrong", attemptsLeft: MAX_ATTEMPTS - count };
  }

  // 3) Succes: curățăm throttling-ul și contoarele contului.
  await supabase.from("login_attempts").delete().eq("ip", ip).eq("role", role);
  await supabase.from("users").update({ failed_attempts: 0, locked_until: null }).eq("id", matched.id);

  await createSession({
    id: matched.id,
    full_name: matched.full_name,
    role: matched.role,
    language_pref: matched.language_pref,
    assigned_car_id: matched.assigned_car_id,
  });
  await audit({ userId: matched.id, action: "auth.login", entity: "user", entityId: matched.id });

  return { ok: true, role: matched.role };
}
