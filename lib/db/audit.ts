import "server-only";
import { after } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";

/**
 * Scrie o intrare în audit log (cine, ce, când), DUPĂ ce răspunsul a fost trimis
 * (`after`), ca să nu adauge latență pe drumul critic al acțiunii. Nu aruncă erori.
 */
export async function audit(params: {
  userId: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  details?: Record<string, unknown>;
}): Promise<void> {
  const write = async () => {
    try {
      await getAdminClient().from("audit_log").insert({
        user_id: params.userId,
        action: params.action,
        entity: params.entity,
        entity_id: params.entityId ?? null,
        details: params.details ?? null,
      });
    } catch (err) {
      console.error("[audit] eșec la scrierea în audit_log:", err);
    }
  };
  try {
    after(write); // rulează după ce s-a trimis răspunsul
  } catch {
    // În afara contextului de request (rar) — scriem direct, fără a bloca.
    void write();
  }
}
