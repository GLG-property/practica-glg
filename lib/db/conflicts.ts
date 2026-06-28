import "server-only";
import { getAdminClient } from "@/lib/supabase/admin";

export type ConflictKind = "instructor" | "car" | null;

/**
 * Verifică suprapuneri înainte de a salva o lecție (mesaj prietenos).
 * Constrângerile EXCLUDE din DB sunt plasa de siguranță finală.
 */
export async function findConflict(params: {
  instructorId: string;
  carId: string | null;
  start: string;
  end: string;
  excludeLessonId?: string;
}): Promise<ConflictKind> {
  const supabase = getAdminClient();
  const live = ["scheduled", "completed"];

  {
    let q = supabase
      .from("lessons")
      .select("id")
      .eq("instructor_id", params.instructorId)
      .in("status", live)
      .lt("start_time", params.end)
      .gt("end_time", params.start);
    if (params.excludeLessonId) q = q.neq("id", params.excludeLessonId);
    const { data } = await q.limit(1);
    if (data && data.length > 0) return "instructor";
  }

  if (params.carId) {
    let q = supabase
      .from("lessons")
      .select("id")
      .eq("car_id", params.carId)
      .in("status", live)
      .lt("start_time", params.end)
      .gt("end_time", params.start);
    if (params.excludeLessonId) q = q.neq("id", params.excludeLessonId);
    const { data } = await q.limit(1);
    if (data && data.length > 0) return "car";
  }

  return null;
}
