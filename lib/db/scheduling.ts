import "server-only";
import { getAdminClient } from "@/lib/supabase/admin";
import { findConflict } from "@/lib/db/conflicts";
import { audit } from "@/lib/db/audit";
import { scheduleReminderForLesson } from "@/lib/notifications/schedule";
import { addHoursISO } from "@/lib/utils/date";
import type { LessonStatus, StudentInstructor } from "@/lib/db/types";

const PHASE1_REQUIRED = 12; // lecții programate în faza 1 pentru a debloca faza 2
const PHASE2_MIN_COMPLETED = 8; // lecții efectuate în faza 1 pentru a debloca faza 2

export type CreateLessonResult =
  | { ok: true; lessonId: string }
  | {
      ok: false;
      reason: "conflict_instructor" | "conflict_car" | "phase2_locked" | "phase_full" | "error";
      bookedPhase1?: number;
      completedPhase1?: number;
    };

/** Numărul de lecții efectuate într-o fază pentru un elev. */
export async function completedLessonsCount(studentId: string, phase: 1 | 2): Promise<number> {
  const supabase = getAdminClient();
  const { count } = await supabase
    .from("lessons")
    .select("id", { count: "exact", head: true })
    .eq("student_id", studentId)
    .eq("phase", phase)
    .eq("status", "completed");
  return count ?? 0;
}

/**
 * Creează o lecție pe baza unei atribuiri (student_instructor), cu:
 *  - detectare conflicte (instructor + mașină),
 *  - gate faza 2 (blocată până la 12 lecții efectuate în faza 1; adminul poate forța).
 */
export async function createLesson(params: {
  assignmentId: string;
  start: string;
  durationHours: number;
  scheduledByUserId: string;
  operatorId?: string | null;
  override?: boolean; // doar admin
}): Promise<CreateLessonResult> {
  const supabase = getAdminClient();

  const { data: a } = await supabase
    .from("student_instructors")
    .select("*")
    .eq("id", params.assignmentId)
    .single();
  if (!a) return { ok: false, reason: "error" };
  const assignment = a as StudentInstructor;

  // O singură interogare pentru toate lecțiile elevului → calculăm programate + efectuate/fază.
  const { data: ls } = await supabase
    .from("lessons")
    .select("phase, status")
    .eq("student_id", assignment.student_id);
  const booked: Record<number, number> = { 1: 0, 2: 0 };
  const completed: Record<number, number> = { 1: 0, 2: 0 };
  for (const l of (ls as { phase: number; status: string }[]) ?? []) {
    if (l.status === "scheduled" || l.status === "completed") booked[l.phase] = (booked[l.phase] ?? 0) + 1;
    if (l.status === "completed") completed[l.phase] = (completed[l.phase] ?? 0) + 1;
  }

  // CAP: nu se pot programa mai mult de `required_lessons` lecții (programate) pe o fază.
  const required = assignment.required_lessons || PHASE1_REQUIRED;
  if (!params.override && (booked[assignment.phase] ?? 0) >= required) {
    return { ok: false, reason: "phase_full" };
  }

  // GATE faza 2: se deblochează când faza 1 are 12 lecții PROGRAMATE și minim 8 EFECTUATE.
  if (assignment.phase === 2 && !params.override) {
    const bookedP1 = booked[1] ?? 0;
    const completedP1 = completed[1] ?? 0;
    if (bookedP1 < PHASE1_REQUIRED || completedP1 < PHASE2_MIN_COMPLETED) {
      return { ok: false, reason: "phase2_locked", bookedPhase1: bookedP1, completedPhase1: completedP1 };
    }
  }

  const end = addHoursISO(params.start, params.durationHours);

  const conflict = await findConflict({
    instructorId: assignment.instructor_id,
    carId: assignment.car_id,
    start: params.start,
    end,
  });
  if (conflict === "instructor") return { ok: false, reason: "conflict_instructor" };
  if (conflict === "car") return { ok: false, reason: "conflict_car" };

  const { data, error } = await supabase
    .from("lessons")
    .insert({
      student_id: assignment.student_id,
      instructor_id: assignment.instructor_id,
      car_id: assignment.car_id,
      assignment_id: assignment.id,
      operator_id: params.operatorId ?? null,
      phase: assignment.phase,
      start_time: params.start,
      end_time: end,
      duration_hours: params.durationHours,
      status: "scheduled",
      created_by_user_id: params.scheduledByUserId,
    })
    .select("id")
    .single();

  if (error) {
    if ((error as { code?: string }).code === "23P01") {
      const c = (error as { constraint?: string; message?: string });
      const desc = c.constraint ?? c.message ?? "";
      return { ok: false, reason: desc.includes("car") ? "conflict_car" : "conflict_instructor" };
    }
    console.error("[createLesson] error:", error);
    return { ok: false, reason: "error" };
  }

  const lessonId = data.id as string;
  await audit({
    userId: params.scheduledByUserId,
    action: "lesson.create",
    entity: "lesson",
    entityId: lessonId,
    details: { student: assignment.student_id, phase: assignment.phase, override: !!params.override },
  });
  await scheduleReminderForLesson(lessonId);
  return { ok: true, lessonId };
}

/** Schimbă statusul unei lecții. `restrictInstructorId` limitează la lecțiile instructorului. */
export async function setLessonStatus(params: {
  lessonId: string;
  status: LessonStatus;
  actorId: string;
  restrictInstructorId?: string;
}): Promise<boolean> {
  const supabase = getAdminClient();
  let q = supabase.from("lessons").update({ status: params.status }).eq("id", params.lessonId);
  if (params.restrictInstructorId) q = q.eq("instructor_id", params.restrictInstructorId);
  // „Efectuat" / „Absent" doar pentru lecții care au început deja (nu din viitor).
  if (params.status === "completed" || params.status === "no_show") {
    q = q.lte("start_time", new Date().toISOString());
  }
  const { data, error } = await q.select("id");
  if (error) {
    console.error("[setLessonStatus]", error);
    return false;
  }
  // Zero rânduri = lecția nu există sau nu aparține instructorului -> NU e succes.
  if (!data || data.length === 0) return false;
  await audit({ userId: params.actorId, action: `lesson.${params.status}`, entity: "lesson", entityId: params.lessonId });
  return true;
}

/** Instructorul marchează o lecție ca achitată cash. */
export async function markLessonPaidByInstructor(params: {
  lessonId: string;
  actorId: string;
  restrictInstructorId?: string;
  paid: boolean;
}): Promise<boolean> {
  const supabase = getAdminClient();
  let q = supabase
    .from("lessons")
    .update({
      payment_by_instructor: params.paid,
      payment_marked_by: params.paid ? params.actorId : null,
      payment_marked_at: params.paid ? new Date().toISOString() : null,
    })
    .eq("id", params.lessonId);
  if (params.restrictInstructorId) q = q.eq("instructor_id", params.restrictInstructorId);
  const { data, error } = await q.select("id");
  if (error) {
    console.error("[markLessonPaidByInstructor]", error);
    return false;
  }
  if (!data || data.length === 0) return false;
  await audit({
    userId: params.actorId,
    action: params.paid ? "payment.instructor_cash" : "payment.instructor_cash_undo",
    entity: "lesson",
    entityId: params.lessonId,
  });
  return true;
}
