"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { getAdminClient } from "@/lib/supabase/admin";
import { audit } from "@/lib/db/audit";

// Datele de tip `date` din formular vin ca "" când sunt goale -> le transformăm în null.
const emptyToNull = (v: unknown) => (v === "" || v == null ? null : v);
const dateField = z.preprocess(
  emptyToNull,
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Dată invalidă")
    .nullable()
);
const notesField = z.preprocess(emptyToNull, z.string().trim().max(500).nullable());

/**
 * Sincronizează legătura mașină↔șofer: un singur instructor per mașină.
 * Golește orice instructor care era pe această mașină, apoi pune noul instructor (dacă există).
 */
async function setCarDriver(carId: string, instructorId: string | null) {
  const supabase = getAdminClient();
  // Scoatem șoferul/șoferii actuali de pe această mașină.
  await supabase
    .from("users")
    .update({ assigned_car_id: null })
    .eq("assigned_car_id", carId)
    .eq("role", "instructor");
  // Atribuim noul șofer (instructorul își mută mașina pe aceasta).
  if (instructorId) {
    await supabase
      .from("users")
      .update({ assigned_car_id: carId })
      .eq("id", instructorId)
      .eq("role", "instructor");
  }
}

const categoryField = z.preprocess(
  (v) => (v == null || v === "" ? "B" : v),
  z.enum(["B", "C", "D", "A"])
);

const carSchema = z.object({
  plate: z.string().trim().min(1, "Numărul e obligatoriu").max(20),
  model: z.string().trim().min(1, "Modelul e obligatoriu").max(60),
  transmission: z.enum(["manual", "automatic"]),
  stage: z.enum(["beginner", "advanced"]),
  category: categoryField,
  itp_expiry: dateField,
  insurance_expiry: dateField,
  service_due: dateField,
  notes: notesField,
});

/** Adaugă o mașină nouă. Doar admin. */
export async function createCarAction(formData: FormData) {
  const user = await requireAdmin();

  const parsed = carSchema.safeParse({
    plate: formData.get("plate"),
    model: formData.get("model"),
    transmission: formData.get("transmission"),
    stage: formData.get("stage"),
    category: formData.get("category"),
    itp_expiry: formData.get("itp_expiry"),
    insurance_expiry: formData.get("insurance_expiry"),
    service_due: formData.get("service_due"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) return { ok: false as const, error: "invalid" };

  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("cars")
    .insert({
      plate: parsed.data.plate,
      model: parsed.data.model,
      transmission: parsed.data.transmission,
      stage: parsed.data.stage,
      category: parsed.data.category,
      itp_expiry: parsed.data.itp_expiry,
      insurance_expiry: parsed.data.insurance_expiry,
      service_due: parsed.data.service_due,
      notes: parsed.data.notes,
      active: true,
    })
    .select("id")
    .single();
  if (error) return { ok: false as const, error: "error" };

  // Legăm șoferul ales de mașina nou creată.
  const instructorId = (formData.get("instructor_id") as string) || null;
  if (data?.id) await setCarDriver(data.id, instructorId);

  await audit({
    userId: user.id,
    action: "car.create",
    entity: "car",
    entityId: data?.id ?? null,
    details: { plate: parsed.data.plate, model: parsed.data.model },
  });
  revalidatePath("/admin/cars");
  revalidatePath("/admin/instructors");
  return { ok: true as const, id: data?.id as string | undefined };
}

const updateSchema = carSchema.extend({
  id: z.string().uuid(),
  active: z.boolean(),
});

/** Actualizează o mașină existentă (inclusiv starea `active`). Doar admin. */
export async function updateCarAction(input: {
  id: string;
  plate: string;
  model: string;
  transmission: string;
  stage: string;
  category?: string;
  instructorId?: string | null;
  itp_expiry: string | null;
  insurance_expiry: string | null;
  service_due: string | null;
  notes?: string | null;
  active: boolean;
}) {
  const user = await requireAdmin();

  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "invalid" };

  const supabase = getAdminClient();
  const { error } = await supabase
    .from("cars")
    .update({
      plate: parsed.data.plate,
      model: parsed.data.model,
      transmission: parsed.data.transmission,
      stage: parsed.data.stage,
      category: parsed.data.category,
      itp_expiry: parsed.data.itp_expiry,
      insurance_expiry: parsed.data.insurance_expiry,
      service_due: parsed.data.service_due,
      notes: parsed.data.notes,
      active: parsed.data.active,
    })
    .eq("id", parsed.data.id);
  if (error) return { ok: false as const, error: "error" };

  // Sincronizăm șoferul atribuit acestei mașini.
  await setCarDriver(parsed.data.id, input.instructorId ?? null);

  await audit({
    userId: user.id,
    action: "car.update",
    entity: "car",
    entityId: parsed.data.id,
    details: { plate: parsed.data.plate, active: parsed.data.active },
  });
  revalidatePath("/admin/cars");
  revalidatePath("/admin/instructors");
  return { ok: true as const };
}
