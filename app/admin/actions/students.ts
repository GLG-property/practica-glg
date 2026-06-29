"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { getAdminClient } from "@/lib/supabase/admin";
import { audit } from "@/lib/db/audit";

// Câmpurile goale din formular vin ca "" -> le transformăm în null.
const emptyToNull = (v: unknown) => (v === "" || v == null ? null : v);
const nullableText = (max: number) =>
  z.preprocess(emptyToNull, z.string().trim().max(max).nullable());
const groupField = z.preprocess(
  emptyToNull,
  z.string().uuid("Grupă invalidă").nullable()
);
const dateField = z.preprocess(
  emptyToNull,
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Dată invalidă").nullable()
);

const studentSchema = z.object({
  first_name: z.string().trim().min(1, "Prenumele e obligatoriu").max(60),
  last_name: z.string().trim().min(1, "Numele e obligatoriu").max(60),
  phone: nullableText(40),
  transmission: z.enum(["manual", "automatic"]),
  group_id: groupField,
  birth_date: dateField,
  theory_teacher: nullableText(120),
  notes: nullableText(1000),
});

/** Adaugă un cursant nou. Doar admin. */
export async function createStudentAction(formData: FormData) {
  const user = await requireAdmin();

  const parsed = studentSchema.safeParse({
    first_name: formData.get("first_name"),
    last_name: formData.get("last_name"),
    phone: formData.get("phone"),
    transmission: formData.get("transmission"),
    group_id: formData.get("group_id"),
    birth_date: formData.get("birth_date"),
    theory_teacher: formData.get("theory_teacher"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) return { ok: false as const, error: "invalid" };

  const supabase = getAdminClient();

  // Profesorul teoretic NU se stochează pe cursant — se ia mereu (live) din grupă
  // la afișare (vezi StudentProfileView). Astfel rămâne corect dacă se schimbă grupa/profesorul.
  const { data, error } = await supabase
    .from("students")
    .insert({
      first_name: parsed.data.first_name,
      last_name: parsed.data.last_name,
      phone: parsed.data.phone,
      transmission: parsed.data.transmission,
      group_id: parsed.data.group_id,
      birth_date: parsed.data.birth_date,
      theory_teacher: null,
      notes: parsed.data.notes,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error) return { ok: false as const, error: "error" };

  await audit({
    userId: user.id,
    action: "student.create",
    entity: "student",
    entityId: data?.id ?? null,
    details: {
      first_name: parsed.data.first_name,
      last_name: parsed.data.last_name,
    },
  });
  revalidatePath("/admin/students");
  return { ok: true as const, studentId: data?.id as string };
}

const updateSchema = studentSchema.extend({ id: z.string().uuid() });

export interface UpdateStudentInput {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  transmission: string;
  group_id: string | null;
  theory_teacher: string | null;
  notes: string | null;
}

/** Actualizează câmpurile editabile ale unui cursant. Doar admin. */
export async function updateStudentAction(input: UpdateStudentInput) {
  const user = await requireAdmin();

  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "invalid" };

  const supabase = getAdminClient();
  const { error } = await supabase
    .from("students")
    .update({
      first_name: parsed.data.first_name,
      last_name: parsed.data.last_name,
      phone: parsed.data.phone,
      transmission: parsed.data.transmission,
      group_id: parsed.data.group_id,
      theory_teacher: parsed.data.theory_teacher,
      notes: parsed.data.notes,
    })
    .eq("id", parsed.data.id);
  if (error) return { ok: false as const, error: "error" };

  await audit({
    userId: user.id,
    action: "student.update",
    entity: "student",
    entityId: parsed.data.id,
  });
  revalidatePath("/admin/students");
  revalidatePath("/admin/students/" + parsed.data.id);
  return { ok: true as const };
}

const paidHoursSchema = z.object({
  studentId: z.string().uuid(),
  hours: z.number().min(0, "Valoare invalidă").max(1000).finite(),
});

/** Setează numărul de ore achitate pentru un cursant. Doar admin. */
export async function setPaidHoursAction(studentId: string, hours: number) {
  const user = await requireAdmin();

  const parsed = paidHoursSchema.safeParse({ studentId, hours });
  if (!parsed.success) return { ok: false as const, error: "invalid" };

  const supabase = getAdminClient();
  const { error } = await supabase
    .from("students")
    .update({ paid_hours: parsed.data.hours })
    .eq("id", parsed.data.studentId);
  if (error) return { ok: false as const, error: "error" };

  await audit({
    userId: user.id,
    action: "student.set_paid_hours",
    entity: "student",
    entityId: parsed.data.studentId,
    details: { paid_hours: parsed.data.hours },
  });
  revalidatePath("/admin/students/" + parsed.data.studentId);
  return { ok: true as const };
}
