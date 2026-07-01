"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireExaminer } from "@/lib/auth/session";
import { getAdminClient } from "@/lib/supabase/admin";
import { audit } from "@/lib/db/audit";

const schema = z.object({
  examId: z.string().uuid(),
  result: z.enum(["pending", "admis", "respins"]),
  mention: z.string().max(1000).nullable().optional(),
});

/**
 * Examinatorul setează rezultatul (admis/respins) + mențiuni pentru un examen.
 * Restricționat la examenele atribuite lui.
 */
export async function setExamResultAction(input: {
  examId: string;
  result: "pending" | "admis" | "respins";
  mention?: string | null;
}) {
  const me = await requireExaminer();

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "invalid" };

  const supabase = getAdminClient();
  const setResult = parsed.data.result !== "pending";
  const { data, error } = await supabase
    .from("exams")
    .update({
      result: parsed.data.result,
      mention: parsed.data.mention?.trim() || null,
      result_at: setResult ? new Date().toISOString() : null,
      result_by: setResult ? me.id : null,
    })
    .eq("id", parsed.data.examId)
    .eq("examiner_id", me.id) // doar examenele lui
    .select("id");
  if (error) return { ok: false as const, error: "error" };
  if (!data || data.length === 0) return { ok: false as const, error: "forbidden" };

  await audit({
    userId: me.id,
    action: "exam.result",
    entity: "exam",
    entityId: parsed.data.examId,
    details: { result: parsed.data.result },
  });
  revalidatePath("/examiner");
  return { ok: true as const };
}
