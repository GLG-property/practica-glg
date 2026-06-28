import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Client Supabase cu cheia `service_role`.
 * ATENȚIE: se folosește DOAR pe server. Cheia ocolește RLS, deci nu trebuie
 * să ajungă niciodată în browser. `import "server-only"` garantează asta:
 * dacă cineva încearcă să-l importe într-un Client Component, build-ul eșuează.
 */
let cached: SupabaseClient | null = null;

export function getAdminClient(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Lipsesc variabilele Supabase. Setează NEXT_PUBLIC_SUPABASE_URL și SUPABASE_SERVICE_ROLE_KEY în .env.local"
    );
  }

  cached = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cached;
}
