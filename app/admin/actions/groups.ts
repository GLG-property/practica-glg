"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { getAdminClient } from "@/lib/supabase/admin";
import { getAllOperators } from "@/lib/db/queries";
import { audit } from "@/lib/db/audit";

// Câmpurile goale din formular vin ca "" -> le transformăm în null.
const emptyToNull = (v: unknown) => (v === "" || v == null ? null : v);
const nullableText = (max: number) =>
  z.preprocess(emptyToNull, z.string().trim().max(max).nullable());
const dateField = z.preprocess(
  emptyToNull,
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Dată invalidă").nullable()
);

// ---------------- CREATE GROUP ----------------

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  theory_teacher: nullableText(120),
  start_date: dateField,
  end_date: dateField,
});

/** Creează o grupă nouă (status „draft"). Doar admin. */
export async function createGroupAction(formData: FormData) {
  const admin = await requireAdmin();

  const parsed = createSchema.safeParse({
    name: formData.get("name"),
    theory_teacher: formData.get("theory_teacher"),
    start_date: formData.get("start_date"),
    end_date: formData.get("end_date"),
  });
  if (!parsed.success) return { ok: false as const, error: "invalid" };
  if (parsed.data.start_date && parsed.data.end_date && parsed.data.end_date < parsed.data.start_date) {
    return { ok: false as const, error: "invalid_dates" };
  }

  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("groups")
    .insert({
      name: parsed.data.name,
      theory_teacher: parsed.data.theory_teacher,
      start_date: parsed.data.start_date,
      end_date: parsed.data.end_date,
      status: "draft",
      created_by: admin.id,
    })
    .select("id")
    .single();
  if (error) return { ok: false as const, error: "error" };

  await audit({
    userId: admin.id,
    action: "group.create",
    entity: "group",
    entityId: (data as { id: string })?.id ?? null,
    details: { name: parsed.data.name },
  });
  revalidatePath("/admin/groups");
  return { ok: true as const, groupId: (data as { id: string })?.id };
}

/** Arhivează / dezarhivează manual o grupă. Doar admin. */
export async function setGroupArchivedAction(groupId: string, archived: boolean) {
  const admin = await requireAdmin();
  if (!z.string().uuid().safeParse(groupId).success) return { ok: false as const };
  const supabase = getAdminClient();
  const { error } = await supabase.from("groups").update({ archived }).eq("id", groupId);
  if (error) return { ok: false as const };
  await audit({ userId: admin.id, action: archived ? "group.archive" : "group.unarchive", entity: "group", entityId: groupId });
  revalidatePath("/admin/groups");
  return { ok: true as const };
}

// ---------------- ASSIGN INSTRUCTOR ----------------

const assignSchema = z.object({
  studentId: z.string().uuid(),
  phase: z.union([z.literal(1), z.literal(2)]),
  instructorId: z.string().uuid(),
});

export interface AssignInstructorInput {
  studentId: string;
  phase: 1 | 2;
  instructorId: string;
}

/** Atribuie un instructor unui cursant pe o fază (1 sau 2). Doar admin. */
export async function assignInstructorAction(input: AssignInstructorInput) {
  const admin = await requireAdmin();

  const parsed = assignSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "invalid" };

  const supabase = getAdminClient();

  // Cursantul + statusul grupei (atribuirile se pot schimba doar cât grupa e „draft").
  const { data: student } = await supabase
    .from("students")
    .select("transmission, group_id")
    .eq("id", parsed.data.studentId)
    .single();
  if (!student) return { ok: false as const, error: "error" };
  if ((student as { group_id: string | null }).group_id) {
    const { data: grp } = await supabase
      .from("groups")
      .select("status")
      .eq("id", (student as { group_id: string }).group_id)
      .single();
    if ((grp as { status: string } | null)?.status !== "draft") {
      return { ok: false as const, error: "locked" };
    }
  }

  // Instructorul activ + mașina lui (etapă + cutie).
  const { data: instr } = await supabase
    .from("users")
    .select("id, active, assigned_car_id, car:cars(stage, transmission, category)")
    .eq("id", parsed.data.instructorId)
    .eq("role", "instructor")
    .single();
  if (!instr || !(instr as { active: boolean }).active) return { ok: false as const, error: "error" };

  const car = (instr as unknown as { car: { stage: string; transmission: string; category: string } | null }).car;
  // Adminul vede lista completă și poate atribui orice instructor (cat. B) pe orice fază
  // — flexibil pentru schimbări/concedii. Mașina rezultă din instructor.
  if (!car || car.category !== "B") {
    return { ok: false as const, error: "ineligible" };
  }

  const { error } = await supabase.from("student_instructors").upsert(
    {
      student_id: parsed.data.studentId,
      instructor_id: parsed.data.instructorId,
      car_id: (instr as { assigned_car_id: string | null }).assigned_car_id,
      phase: parsed.data.phase,
      required_lessons: 12,
    },
    { onConflict: "student_id,phase" }
  );
  if (error) return { ok: false as const, error: "error" };

  await audit({
    userId: admin.id,
    action: "student.assign_instructor",
    entity: "student",
    entityId: parsed.data.studentId,
    details: { phase: parsed.data.phase, instructor_id: parsed.data.instructorId },
  });

  revalidatePath("/admin/groups");
  const groupId = (student as { group_id: string | null }).group_id;
  if (groupId) revalidatePath("/admin/groups/" + groupId);
  return { ok: true as const };
}

// ---------------- SEND TO OPERATORS ----------------

const sendSchema = z.object({
  groupId: z.string().uuid(),
  method: z.enum(["balanced", "manual"]),
  manual: z.record(z.string().uuid()).optional(),
});

export interface SendToOperatorsInput {
  groupId: string;
  method: "balanced" | "manual";
  /** studentId -> operatorId (folosit doar pentru „manual"). */
  manual?: Record<string, string>;
}

/** Amestecă un array pe loc (Fisher–Yates). Rulează în runtime-ul app, permis. */
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Repartizează cursanții grupei la operatori și marchează grupa „trimisă".
 * Verifică întâi că fiecare cursant are exact 2 atribuiri (faza 1 + faza 2).
 */
export async function sendToOperatorsAction(input: SendToOperatorsInput) {
  const admin = await requireAdmin();

  const parsed = sendSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, reason: "invalid" as const };

  const supabase = getAdminClient();

  // 0) Grupa trebuie să fie încă „draft" (idempotență: nu retrimitem o grupă deja trimisă).
  const { data: grp } = await supabase
    .from("groups")
    .select("status")
    .eq("id", parsed.data.groupId)
    .single();
  if (!grp) return { ok: false as const, reason: "invalid" as const };
  if ((grp as { status: string }).status !== "draft") {
    return { ok: false as const, reason: "already_sent" as const };
  }

  // 1) Cursanții grupei.
  const { data: studentsData } = await supabase
    .from("students")
    .select("id")
    .eq("group_id", parsed.data.groupId);
  const studentIds = ((studentsData as { id: string }[]) ?? []).map((s) => s.id);
  if (studentIds.length === 0) return { ok: false as const, reason: "not_ready" as const };

  // 2) Fiecare cursant trebuie să aibă faza 1 ȘI faza 2.
  const { data: siData } = await supabase
    .from("student_instructors")
    .select("student_id, phase")
    .in("student_id", studentIds);
  const phasesByStudent = new Map<string, Set<number>>();
  for (const row of (siData as { student_id: string; phase: number }[]) ?? []) {
    const set = phasesByStudent.get(row.student_id) ?? new Set<number>();
    set.add(row.phase);
    phasesByStudent.set(row.student_id, set);
  }
  for (const sid of studentIds) {
    const set = phasesByStudent.get(sid);
    if (!set || !set.has(1) || !set.has(2)) {
      return { ok: false as const, reason: "not_ready" as const };
    }
  }

  // 3) Construim rândurile de atribuire la operatori.
  let rows: { student_id: string; operator_id: string }[];

  if (parsed.data.method === "balanced") {
    const operators = (await getAllOperators()).filter((o) => o.active);
    if (operators.length === 0) return { ok: false as const, reason: "no_operators" as const };
    const ops = operators.map((o) => o.id);
    const order = shuffle([...studentIds]);
    rows = order.map((sid, i) => ({ student_id: sid, operator_id: ops[i % ops.length] }));
  } else {
    const map = parsed.data.manual ?? {};
    // Verificăm că fiecare cursant are un operator valid și activ.
    const operators = (await getAllOperators()).filter((o) => o.active);
    const validOps = new Set(operators.map((o) => o.id));
    rows = [];
    for (const sid of studentIds) {
      const opId = map[sid];
      if (!opId || !validOps.has(opId)) {
        return { ok: false as const, reason: "missing_operator" as const };
      }
      rows.push({ student_id: sid, operator_id: opId });
    }
  }

  // 4) Upsert pe operator_assignments (UNIQUE student_id).
  const { error: upErr } = await supabase
    .from("operator_assignments")
    .upsert(rows, { onConflict: "student_id" });
  if (upErr) return { ok: false as const, reason: "error" as const };

  // 5) Marcăm grupa ca trimisă (condiționat de „draft", pentru siguranță la curse).
  const { error: gErr } = await supabase
    .from("groups")
    .update({ status: "sent", sent_at: new Date().toISOString() })
    .eq("id", parsed.data.groupId)
    .eq("status", "draft");
  if (gErr) return { ok: false as const, reason: "error" as const };

  await audit({
    userId: admin.id,
    action: "group.send_to_operators",
    entity: "group",
    entityId: parsed.data.groupId,
    details: { method: parsed.data.method, count: rows.length },
  });

  revalidatePath("/admin/groups");
  revalidatePath("/admin/groups/" + parsed.data.groupId);
  return { ok: true as const };
}
