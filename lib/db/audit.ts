import "server-only";
import { getAdminClient } from "@/lib/supabase/admin";

/**
 * Scrie o intrare în audit log (cine, ce, când). Nu aruncă erori — auditul
 * nu trebuie să blocheze acțiunea principală dacă, de ex., DB e momentan ocupat.
 */
export async function audit(params: {
  userId: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  details?: Record<string, unknown>;
}): Promise<void> {
  try {
    const supabase = getAdminClient();
    await supabase.from("audit_log").insert({
      user_id: params.userId,
      action: params.action,
      entity: params.entity,
      entity_id: params.entityId ?? null,
      details: params.details ?? null,
    });
  } catch (err) {
    // Logăm pe server, dar nu propagăm.
    console.error("[audit] eșec la scrierea în audit_log:", err);
  }
}
