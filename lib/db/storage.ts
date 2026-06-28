import "server-only";
import { getAdminClient } from "@/lib/supabase/admin";

/**
 * Încarcă un fișier (poză/screenshot) în Supabase Storage și întoarce URL-ul public.
 * Întoarce null dacă nu există fișier sau încărcarea eșuează (nu blocăm acțiunea).
 */
export async function uploadFile(
  bucket: "photos" | "screenshots",
  file: File | null | undefined
): Promise<string | null> {
  if (!file || file.size === 0) return null;
  try {
    const supabase = getAdminClient();
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    // Nume unic fără a folosi Math.random (deterministic-friendly): timestamp + size.
    const filename = `${Date.now()}-${file.size}.${ext}`;
    const arrayBuffer = await file.arrayBuffer();
    const { error } = await supabase.storage
      .from(bucket)
      .upload(filename, arrayBuffer, {
        contentType: file.type || "image/jpeg",
        upsert: false,
      });
    if (error) {
      console.error("[storage] upload error:", error.message);
      return null;
    }
    const { data } = supabase.storage.from(bucket).getPublicUrl(filename);
    return data.publicUrl;
  } catch (err) {
    console.error("[storage] upload exception:", err);
    return null;
  }
}
