"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser, requireRole } from "@/lib/auth/session";
import { getAdminClient } from "@/lib/supabase/admin";
import { uploadFile } from "@/lib/db/storage";
import { audit } from "@/lib/db/audit";
import { setLessonStatus, markLessonPaidByInstructor } from "@/lib/db/scheduling";
import type { LessonStatus, SessionUser } from "@/lib/db/types";

function revalidateAll() {
  revalidatePath("/instructor");
  revalidatePath("/operator");
  revalidatePath("/admin");
}

/** Verifică dacă utilizatorul are dreptul să atingă acest cursant. */
async function canTouchStudent(user: SessionUser, studentId: string): Promise<boolean> {
  if (user.role === "admin") return true;
  const supabase = getAdminClient();
  if (user.role === "instructor") {
    const { data } = await supabase
      .from("student_instructors")
      .select("id")
      .eq("instructor_id", user.id)
      .eq("student_id", studentId)
      .limit(1);
    return !!(data && data.length);
  }
  // operator
  const { data } = await supabase
    .from("operator_assignments")
    .select("id")
    .eq("operator_id", user.id)
    .eq("student_id", studentId)
    .limit(1);
  return !!(data && data.length);
}

const markSchema = z.object({
  lessonId: z.string().uuid(),
  status: z.enum(["completed", "no_show", "cancelled", "scheduled"]),
});

/** Marchează statusul unei lecții. Doar admin sau instructor (instructorul doar pe ale lui). */
export async function markLessonAction(input: { lessonId: string; status: LessonStatus }) {
  const user = await requireRole("admin", "instructor");
  const parsed = markSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const };
  const ok = await setLessonStatus({
    lessonId: parsed.data.lessonId,
    status: parsed.data.status,
    actorId: user.id,
    restrictInstructorId: user.role === "instructor" ? user.id : undefined,
  });
  revalidateAll();
  return { ok };
}

/** Marchează/anulează plata cash. Doar admin sau instructor (instructorul doar pe ale lui). */
export async function markPaymentAction(input: { lessonId: string; paid: boolean }) {
  const user = await requireRole("admin", "instructor");
  if (!z.string().uuid().safeParse(input.lessonId).success) return { ok: false as const };
  const ok = await markLessonPaidByInstructor({
    lessonId: input.lessonId,
    actorId: user.id,
    paid: !!input.paid,
    restrictInstructorId: user.role === "instructor" ? user.id : undefined,
  });
  revalidateAll();
  return { ok };
}

const remarkSchema = z.object({
  studentId: z.string().uuid(),
  lessonId: z.string().uuid().optional().nullable(),
  text: z.string().min(1).max(2000),
});

/** Adaugă o remarcă pe profilul elevului (+ screenshot opțional). Verifică apartenența. */
export async function addRemarkAction(formData: FormData) {
  const user = await requireUser();
  const parsed = remarkSchema.safeParse({
    studentId: formData.get("studentId"),
    lessonId: formData.get("lessonId") || null,
    text: formData.get("text"),
  });
  if (!parsed.success) return { ok: false as const, error: "invalid" };
  if (!(await canTouchStudent(user, parsed.data.studentId))) {
    return { ok: false as const, error: "forbidden" };
  }

  const screenshotUrl = await uploadFile("screenshots", formData.get("screenshot") as File | null);
  const supabase = getAdminClient();
  const { error } = await supabase.from("student_remarks").insert({
    student_id: parsed.data.studentId,
    lesson_id: parsed.data.lessonId,
    author_id: user.id,
    text: parsed.data.text,
    screenshot_url: screenshotUrl,
  });
  if (error) return { ok: false as const, error: "error" };

  if (parsed.data.lessonId) {
    // Doar dacă lecția chiar aparține acestui cursant.
    await supabase
      .from("lessons")
      .update({ remarks: parsed.data.text })
      .eq("id", parsed.data.lessonId)
      .eq("student_id", parsed.data.studentId);
  }
  await audit({ userId: user.id, action: "remark.create", entity: "student", entityId: parsed.data.studentId });
  revalidatePath(`/instructor/students/${parsed.data.studentId}`);
  revalidatePath(`/admin/students/${parsed.data.studentId}`);
  revalidatePath(`/operator/students/${parsed.data.studentId}`);
  return { ok: true as const };
}

/** Generează cod de legare pentru notificările elevului. Orice rol care deține cursantul. */
export async function generateLinkCodeAction(studentId: string) {
  const user = await requireUser();
  if (!z.string().uuid().safeParse(studentId).success) return { ok: false as const };
  if (!(await canTouchStudent(user, studentId))) return { ok: false as const };
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const supabase = getAdminClient();
  const { error } = await supabase.from("students").update({ link_code: code }).eq("id", studentId);
  if (error) return { ok: false as const };
  await audit({ userId: user.id, action: "student.link_code", entity: "student", entityId: studentId });
  return { ok: true as const, code };
}
