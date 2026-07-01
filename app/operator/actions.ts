"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireOperator } from "@/lib/auth/session";
import { getAdminClient } from "@/lib/supabase/admin";
import { createLesson, type CreateLessonResult } from "@/lib/db/scheduling";
import { getLessonsRange } from "@/lib/db/queries";
import { audit } from "@/lib/db/audit";
import { combineDateTime, dayRange, monthRange, isoToYmd } from "@/lib/utils/date";
import { studentName } from "@/lib/db/types";

/** Verifică dacă elevul `studentId` este atribuit operatorului `operatorId`. */
async function operatorOwnsStudent(operatorId: string, studentId: string): Promise<boolean> {
  const supabase = getAdminClient();
  const { data } = await supabase
    .from("operator_assignments")
    .select("id")
    .eq("operator_id", operatorId)
    .eq("student_id", studentId)
    .maybeSingle();
  return !!data;
}

const createSchema = z.object({
  assignmentId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  durationHours: z.number().positive().max(8),
});

/**
 * Operatorul programează o lecție pe baza unei atribuiri (faza 1 / faza 2).
 * Verifică întâi că atribuirea aparține unui elev atribuit acestui operator.
 */
export async function createLessonOperatorAction(input: {
  assignmentId: string;
  date: string;
  startTime: string;
  durationHours: number;
}): Promise<CreateLessonResult> {
  const s = await requireOperator();
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "error" };

  const supabase = getAdminClient();
  const { data: assignment } = await supabase
    .from("student_instructors")
    .select("student_id")
    .eq("id", parsed.data.assignmentId)
    .maybeSingle();
  if (!assignment) return { ok: false, reason: "error" };

  const owns = await operatorOwnsStudent(s.id, (assignment as { student_id: string }).student_id);
  if (!owns) return { ok: false, reason: "error" };

  const start = combineDateTime(parsed.data.date, parsed.data.startTime);
  const res = await createLesson({
    assignmentId: parsed.data.assignmentId,
    start,
    durationHours: parsed.data.durationHours,
    scheduledByUserId: s.id,
    operatorId: s.id,
  });

  revalidatePath("/operator/schedule/" + (assignment as { student_id: string }).student_id);
  revalidatePath("/operator/calendar");
  revalidatePath("/operator");
  return res;
}

export interface DayLessonLite {
  id: string;
  start_time: string;
  end_time: string;
  student: string;
  status: string;
}

/** Lecțiile unui instructor într-o anumită zi (pentru a evita conflicte la programare). */
export async function getInstructorDayAction(instructorId: string, date: string): Promise<DayLessonLite[]> {
  await requireOperator();
  if (!z.string().uuid().safeParse(instructorId).success) return [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return [];

  const base = new Date(date + "T12:00:00");
  const { start, end } = dayRange(base);
  const lessons = await getLessonsRange({ start, end, instructorId });
  return lessons.map((l) => ({
    id: l.id,
    start_time: l.start_time,
    end_time: l.end_time,
    student: l.student ? studentName(l.student) : "—",
    status: l.status,
  }));
}

export interface DayLoad {
  date: string; // YYYY-MM-DD
  count: number;
}

/** Numărul de lecții pe fiecare zi a lunii pentru un instructor (pentru calendarul liber/ocupat). */
export async function getInstructorMonthAction(instructorId: string, monthIso: string): Promise<DayLoad[]> {
  await requireOperator();
  if (!z.string().uuid().safeParse(instructorId).success) return [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(monthIso)) return [];

  const base = new Date(monthIso + "T12:00:00");
  const { start, end } = monthRange(base);
  const lessons = await getLessonsRange({ start, end, instructorId });

  const counts = new Map<string, number>();
  for (const l of lessons) {
    if (l.status === "cancelled") continue; // anulate nu ocupă
    const ymd = isoToYmd(l.start_time);
    counts.set(ymd, (counts.get(ymd) ?? 0) + 1);
  }
  return [...counts.entries()].map(([date, count]) => ({ date, count }));
}

const reassignSchema = z.object({
  studentId: z.string().uuid(),
  phase: z.union([z.literal(1), z.literal(2)]),
  instructorId: z.string().uuid(),
});

/**
 * Operatorul mută un cursant pe alt instructor pe o fază (schimbări / concedii).
 * Orele rămân (se numără pe fază, nu pe instructor). Lecțiile VIITOARE programate
 * ale acestei atribuiri se mută pe noul instructor + mașină.
 */
export async function reassignInstructorOperatorAction(input: {
  studentId: string;
  phase: 1 | 2;
  instructorId: string;
}): Promise<{ ok: boolean; error?: string }> {
  const s = await requireOperator();
  const parsed = reassignSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };

  const owns = await operatorOwnsStudent(s.id, parsed.data.studentId);
  if (!owns) return { ok: false, error: "forbidden" };

  const supabase = getAdminClient();

  // Noul instructor + mașina lui (trebuie activ, categoria B).
  const { data: instr } = await supabase
    .from("users")
    .select("id, active, assigned_car_id, car:cars(category)")
    .eq("id", parsed.data.instructorId)
    .eq("role", "instructor")
    .single();
  if (!instr || !(instr as { active: boolean }).active) return { ok: false, error: "error" };
  const car = (instr as unknown as { car: { category: string } | null }).car;
  if (!car || car.category !== "B") return { ok: false, error: "ineligible" };
  const newCarId = (instr as { assigned_car_id: string | null }).assigned_car_id;

  // Atribuirea existentă pentru fază.
  const { data: assignment } = await supabase
    .from("student_instructors")
    .select("id")
    .eq("student_id", parsed.data.studentId)
    .eq("phase", parsed.data.phase)
    .maybeSingle();
  if (!assignment) return { ok: false, error: "no_assignment" };
  const assignmentId = (assignment as { id: string }).id;

  // Actualizăm atribuirea (instructor + mașină). Orele rămân (sunt pe fază).
  const { error: upErr } = await supabase
    .from("student_instructors")
    .update({ instructor_id: parsed.data.instructorId, car_id: newCarId })
    .eq("id", assignmentId);
  if (upErr) return { ok: false, error: "error" };

  // Mutăm lecțiile VIITOARE programate pe noul instructor + mașină.
  const nowIso = new Date().toISOString();
  await supabase
    .from("lessons")
    .update({ instructor_id: parsed.data.instructorId, car_id: newCarId })
    .eq("assignment_id", assignmentId)
    .eq("status", "scheduled")
    .gt("start_time", nowIso);

  await audit({
    userId: s.id,
    action: "student.reassign_instructor",
    entity: "student",
    entityId: parsed.data.studentId,
    details: { phase: parsed.data.phase, instructor_id: parsed.data.instructorId },
  });
  revalidatePath("/operator/students/" + parsed.data.studentId);
  revalidatePath("/operator/schedule/" + parsed.data.studentId);
  revalidatePath("/operator/calendar");
  return { ok: true };
}

const paidSchema = z.object({
  studentId: z.string().uuid(),
  hours: z.number().min(0).max(1000),
});

/** Setează orele achitate ale unui elev (doar pentru elevii proprii). */
export async function setPaidHoursOperatorAction(
  studentId: string,
  hours: number
): Promise<{ ok: boolean }> {
  const s = await requireOperator();
  const parsed = paidSchema.safeParse({ studentId, hours });
  if (!parsed.success) return { ok: false };

  const owns = await operatorOwnsStudent(s.id, parsed.data.studentId);
  if (!owns) return { ok: false };

  const supabase = getAdminClient();
  const { error } = await supabase
    .from("students")
    .update({ paid_hours: parsed.data.hours })
    .eq("id", parsed.data.studentId);
  if (error) return { ok: false };

  await audit({
    userId: s.id,
    action: "payment.set_hours",
    entity: "student",
    entityId: parsed.data.studentId,
    details: { hours: parsed.data.hours },
  });
  revalidatePath("/operator/students/" + parsed.data.studentId);
  revalidatePath("/operator");
  return { ok: true };
}
