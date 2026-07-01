"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { getAdminClient } from "@/lib/supabase/admin";
import { audit } from "@/lib/db/audit";
import { combineDateTime } from "@/lib/utils/date";

const emptyToNull = (v: unknown) => (v === "" || v == null ? null : v);

const createSchema = z.object({
  student_id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Dată invalidă"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Oră invalidă"),
  examiner_id: z.preprocess(emptyToNull, z.string().uuid().nullable()),
});

/** Programează un examen practic intern pentru un cursant. Doar admin. */
export async function createExamAction(formData: FormData) {
  const admin = await requireAdmin();

  const parsed = createSchema.safeParse({
    student_id: formData.get("student_id"),
    date: formData.get("date"),
    time: formData.get("time"),
    examiner_id: formData.get("examiner_id"),
  });
  if (!parsed.success) return { ok: false as const, error: "invalid" };

  const scheduled_at = combineDateTime(parsed.data.date, parsed.data.time);

  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("exams")
    .insert({
      student_id: parsed.data.student_id,
      exam_type: "practical_internal",
      scheduled_at,
      examiner_id: parsed.data.examiner_id,
      result: "pending",
      created_by: admin.id,
    })
    .select("id")
    .single();
  if (error) return { ok: false as const, error: "error" };

  await audit({
    userId: admin.id,
    action: "exam.create",
    entity: "exam",
    entityId: (data as { id: string } | null)?.id ?? null,
    details: { student: parsed.data.student_id, scheduled_at },
  });
  revalidatePath("/admin/exams");
  return { ok: true as const };
}

/** Șterge un examen programat. Doar admin. */
export async function deleteExamAction(examId: string) {
  const admin = await requireAdmin();
  if (!z.string().uuid().safeParse(examId).success) return { ok: false as const };

  const supabase = getAdminClient();
  const { error } = await supabase.from("exams").delete().eq("id", examId);
  if (error) return { ok: false as const };

  await audit({ userId: admin.id, action: "exam.delete", entity: "exam", entityId: examId });
  revalidatePath("/admin/exams");
  return { ok: true as const };
}
