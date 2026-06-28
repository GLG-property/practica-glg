"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { getAdminClient } from "@/lib/supabase/admin";
import { audit } from "@/lib/db/audit";
import { hashCode, isValidCodeFormat, isCodeTaken } from "@/lib/auth/code";

const createSchema = z.object({
  full_name: z.string().min(1).max(120),
  phone: z.string().max(40).nullable().optional(),
  language_pref: z.enum(["ro", "ru"]),
  code: z.string(),
});

/** Creează un operator nou (cod de 5 cifre obligatoriu). */
export async function createOperatorAction(formData: FormData) {
  const admin = await requireAdmin();

  const parsed = createSchema.safeParse({
    full_name: ((formData.get("full_name") as string) ?? "").trim(),
    phone: ((formData.get("phone") as string) ?? "").trim() || null,
    language_pref: formData.get("language_pref"),
    code: ((formData.get("code") as string) ?? "").trim(),
  });
  if (!parsed.success) return { ok: false as const, error: "invalid" };

  if (!isValidCodeFormat(parsed.data.code, "operator")) {
    return { ok: false as const, error: "code" };
  }
  if (await isCodeTaken("operator", parsed.data.code)) {
    return { ok: false as const, error: "code_taken" };
  }

  const code_hash = await hashCode(parsed.data.code);
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("users")
    .insert({
      role: "operator",
      full_name: parsed.data.full_name,
      phone: parsed.data.phone,
      language_pref: parsed.data.language_pref,
      code_hash,
      active: true,
    })
    .select("id")
    .single();
  if (error) return { ok: false as const, error: "error" };

  await audit({
    userId: admin.id,
    action: "operator.create",
    entity: "user",
    entityId: (data as { id: string } | null)?.id ?? null,
    details: { full_name: parsed.data.full_name },
  });
  revalidatePath("/admin/operators");
  return { ok: true as const };
}

const updateSchema = z.object({
  id: z.string().uuid(),
  full_name: z.string().min(1).max(120),
  phone: z.string().max(40).nullable().optional(),
  language_pref: z.enum(["ro", "ru"]),
  active: z.boolean(),
  code: z.string().nullable().optional(),
});

export type UpdateOperatorInput = z.input<typeof updateSchema>;

/** Actualizează un operator; resetarea codului este opțională. */
export async function updateOperatorAction(input: UpdateOperatorInput) {
  const admin = await requireAdmin();

  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "invalid" };

  const update: Record<string, unknown> = {
    full_name: parsed.data.full_name.trim(),
    phone: parsed.data.phone?.trim() || null,
    language_pref: parsed.data.language_pref,
    active: parsed.data.active,
  };

  const code = parsed.data.code?.trim();
  if (code) {
    if (!isValidCodeFormat(code, "operator")) {
      return { ok: false as const, error: "code" };
    }
    if (await isCodeTaken("operator", code, parsed.data.id)) {
      return { ok: false as const, error: "code_taken" };
    }
    update.code_hash = await hashCode(code);
  }

  const supabase = getAdminClient();
  const { error } = await supabase
    .from("users")
    .update(update)
    .eq("id", parsed.data.id)
    .eq("role", "operator");
  if (error) return { ok: false as const, error: "error" };

  await audit({
    userId: admin.id,
    action: "operator.update",
    entity: "user",
    entityId: parsed.data.id,
    details: { active: parsed.data.active, code_reset: !!code },
  });
  revalidatePath("/admin/operators");
  return { ok: true as const };
}
