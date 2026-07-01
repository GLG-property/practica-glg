"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { getAdminClient } from "@/lib/supabase/admin";
import { audit } from "@/lib/db/audit";
import { hashCode, isValidCodeFormat, isCodeTaken } from "@/lib/auth/code";

// ---- Helpere de validare ----

const langEnum = z.enum(["ro", "ru"]);

/** Transformă "" / undefined / null în null; altfel păstrează string-ul curățat. */
const nullableText = z.preprocess((v) => {
  const s = (v ?? "").toString().trim();
  return s.length ? s : null;
}, z.string().max(160).nullable());

/** UUID opțional pentru mașina atribuită (gol => null). */
const optionalCarId = z.preprocess((v) => {
  const s = (v ?? "").toString().trim();
  return s.length ? s : null;
}, z.string().uuid().nullable());

/** UUID opțional pentru operatorul care gestionează instructorul (gol => null). */
const optionalOperatorId = z.preprocess((v) => {
  const s = (v ?? "").toString().trim();
  return s.length ? s : null;
}, z.string().uuid().nullable());

/** Cod opțional (la editare): gol => string gol. */
const optionalCode = z.preprocess(
  (v) => (v == null ? "" : v.toString().trim()),
  z.string()
);

// ---- CREATE ----

const timeHM = z.string().regex(/^\d{2}:\d{2}$/);

const createSchema = z.object({
  full_name: z.string().trim().min(1).max(120),
  phone: nullableText,
  language_pref: langEnum,
  assigned_car_id: optionalCarId,
  operator_id: optionalOperatorId,
  code: z.string(),
  work_start: timeHM,
  work_end: timeHM,
});

export async function createInstructorAction(formData: FormData) {
  const admin = await requireAdmin();

  const parsed = createSchema.safeParse({
    full_name: formData.get("full_name"),
    phone: formData.get("phone"),
    language_pref: formData.get("language_pref"),
    assigned_car_id: formData.get("assigned_car_id"),
    operator_id: formData.get("operator_id"),
    code: (formData.get("code") ?? "").toString().trim(),
    work_start: (formData.get("work_start") || "08:00").toString(),
    work_end: (formData.get("work_end") || "18:00").toString(),
  });
  if (!parsed.success) return { ok: false as const, error: "invalid" };
  if (parsed.data.work_end <= parsed.data.work_start) {
    return { ok: false as const, error: "invalid_hours" };
  }

  if (!isValidCodeFormat(parsed.data.code, "instructor")) {
    return { ok: false as const, error: "invalid_code" };
  }
  if (await isCodeTaken("instructor", parsed.data.code)) {
    return { ok: false as const, error: "code_taken" };
  }

  const code_hash = await hashCode(parsed.data.code);
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("users")
    .insert({
      role: "instructor",
      full_name: parsed.data.full_name,
      phone: parsed.data.phone,
      language_pref: parsed.data.language_pref,
      assigned_car_id: parsed.data.assigned_car_id,
      operator_id: parsed.data.operator_id,
      code_hash,
      work_start: parsed.data.work_start,
      work_end: parsed.data.work_end,
      active: true,
    })
    .select("id")
    .single();

  if (error) return { ok: false as const, error: "error" };

  await audit({
    userId: admin.id,
    action: "instructor.create",
    entity: "user",
    entityId: (data as { id: string }).id,
    details: { full_name: parsed.data.full_name },
  });
  revalidatePath("/admin/instructors");
  return { ok: true as const };
}

// ---- UPDATE ----

const updateSchema = z.object({
  id: z.string().uuid(),
  full_name: z.string().trim().min(1).max(120),
  phone: nullableText,
  language_pref: langEnum,
  assigned_car_id: optionalCarId,
  operator_id: optionalOperatorId,
  active: z.boolean(),
  code: optionalCode,
  work_start: timeHM,
  work_end: timeHM,
});

export interface UpdateInstructorInput {
  id: string;
  full_name: string;
  phone?: string | null;
  language_pref: "ro" | "ru";
  assigned_car_id?: string | null;
  operator_id?: string | null;
  active: boolean;
  /** Cod nou din 5 cifre; gol => se păstrează codul existent. */
  code?: string | null;
  work_start: string;
  work_end: string;
}

export async function updateInstructorAction(input: UpdateInstructorInput) {
  const admin = await requireAdmin();

  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "invalid" };
  if (parsed.data.work_end <= parsed.data.work_start) {
    return { ok: false as const, error: "invalid_hours" };
  }

  const patch: Record<string, unknown> = {
    full_name: parsed.data.full_name,
    phone: parsed.data.phone,
    language_pref: parsed.data.language_pref,
    assigned_car_id: parsed.data.assigned_car_id,
    operator_id: parsed.data.operator_id,
    active: parsed.data.active,
    work_start: parsed.data.work_start,
    work_end: parsed.data.work_end,
  };

  let codeReset = false;
  if (parsed.data.code.length > 0) {
    if (!isValidCodeFormat(parsed.data.code, "instructor")) {
      return { ok: false as const, error: "invalid_code" };
    }
    if (await isCodeTaken("instructor", parsed.data.code, parsed.data.id)) {
      return { ok: false as const, error: "code_taken" };
    }
    patch.code_hash = await hashCode(parsed.data.code);
    patch.failed_attempts = 0;
    patch.locked_until = null;
    codeReset = true;
  }

  const supabase = getAdminClient();
  const { error } = await supabase
    .from("users")
    .update(patch)
    .eq("id", parsed.data.id)
    .eq("role", "instructor");

  if (error) return { ok: false as const, error: "error" };

  await audit({
    userId: admin.id,
    action: "instructor.update",
    entity: "user",
    entityId: parsed.data.id,
    details: { active: parsed.data.active, codeReset },
  });
  revalidatePath("/admin/instructors");
  return { ok: true as const };
}

/**
 * „Șterge instructorul, dar păstrează mașina" (ex. concediat).
 * Îl dezactivează și îi eliberează mașina (mașina rămâne în flotă).
 */
export async function removeInstructorKeepCarAction(instructorId: string) {
  const admin = await requireAdmin();
  if (!z.string().uuid().safeParse(instructorId).success) return { ok: false as const };

  const supabase = getAdminClient();
  const { error } = await supabase
    .from("users")
    .update({ active: false, assigned_car_id: null })
    .eq("id", instructorId)
    .eq("role", "instructor");
  if (error) return { ok: false as const };

  await audit({ userId: admin.id, action: "instructor.remove_keep_car", entity: "user", entityId: instructorId });
  revalidatePath("/admin/instructors");
  revalidatePath("/admin/cars");
  return { ok: true as const };
}

/** Atribuie/schimbă operatorul care gestionează un instructor. */
export async function setInstructorOperatorAction(instructorId: string, operatorId: string | null) {
  const admin = await requireAdmin();
  if (!z.string().uuid().safeParse(instructorId).success) return { ok: false as const };
  if (operatorId && !z.string().uuid().safeParse(operatorId).success) return { ok: false as const };

  const supabase = getAdminClient();
  const { error } = await supabase
    .from("users")
    .update({ operator_id: operatorId })
    .eq("id", instructorId)
    .eq("role", "instructor");
  if (error) return { ok: false as const };

  await audit({ userId: admin.id, action: "instructor.set_operator", entity: "user", entityId: instructorId, details: { operatorId } });
  revalidatePath("/admin/instructors");
  return { ok: true as const };
}
