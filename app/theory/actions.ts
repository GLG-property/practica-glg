"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireTheory } from "@/lib/auth/session";
import { getAdminClient } from "@/lib/supabase/admin";
import { audit } from "@/lib/db/audit";

const schema = z.object({
  studentId: z.string().uuid(),
  groupId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Dată invalidă"),
  absent: z.boolean(),
});

/**
 * Profesorul teoretic marchează / scoate o absență a unui cursant la o dată.
 * Verifică faptul că grupa îi aparține.
 */
export async function toggleAbsenceAction(input: {
  studentId: string;
  groupId: string;
  date: string;
  absent: boolean;
}) {
  const me = await requireTheory();

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "invalid" };

  const supabase = getAdminClient();

  // Proprietate: grupa trebuie să-i aparțină profesorului.
  const { data: group } = await supabase
    .from("groups")
    .select("theory_teacher_id")
    .eq("id", parsed.data.groupId)
    .single();
  if (!group || (group as { theory_teacher_id: string | null }).theory_teacher_id !== me.id) {
    return { ok: false as const, error: "forbidden" };
  }

  if (parsed.data.absent) {
    const { error } = await supabase.from("theory_absences").upsert(
      {
        student_id: parsed.data.studentId,
        group_id: parsed.data.groupId,
        date: parsed.data.date,
        marked_by: me.id,
      },
      { onConflict: "student_id,date" }
    );
    if (error) return { ok: false as const, error: "error" };
  } else {
    const { error } = await supabase
      .from("theory_absences")
      .delete()
      .eq("student_id", parsed.data.studentId)
      .eq("date", parsed.data.date);
    if (error) return { ok: false as const, error: "error" };
  }

  await audit({
    userId: me.id,
    action: parsed.data.absent ? "theory.absent" : "theory.present",
    entity: "student",
    entityId: parsed.data.studentId,
    details: { date: parsed.data.date, group: parsed.data.groupId },
  });
  revalidatePath("/theory/group/" + parsed.data.groupId);
  return { ok: true as const };
}
