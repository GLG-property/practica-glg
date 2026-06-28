import "server-only";
import bcrypt from "bcryptjs";
import { getAdminClient } from "@/lib/supabase/admin";
import type { User, UserRole } from "@/lib/db/types";

const BCRYPT_ROUNDS = 10;

/** Lungimea codului de login în funcție de rol. */
export function codeLength(role: UserRole): number {
  return role === "admin" ? 8 : 5; // admin 8, operator/instructor 5
}

export async function hashCode(code: string): Promise<string> {
  return bcrypt.hash(code, BCRYPT_ROUNDS);
}

export async function verifyCode(code: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(code, hash);
  } catch {
    return false;
  }
}

export function isValidCodeFormat(code: string, role: UserRole): boolean {
  const n = codeLength(role);
  return new RegExp(`^\\d{${n}}$`).test(code);
}

/**
 * Verifică dacă un cod e deja folosit de alt utilizator al aceluiași rol.
 * Login-ul potrivește codul în interiorul rolului, deci codurile trebuie să fie
 * unice per rol (altfel s-ar putea loga utilizatorul greșit).
 */
export async function isCodeTaken(
  role: UserRole,
  code: string,
  excludeUserId?: string
): Promise<boolean> {
  const supabase = getAdminClient();
  const { data } = await supabase.from("users").select("id, code_hash").eq("role", role);
  for (const u of (data as Pick<User, "id" | "code_hash">[]) ?? []) {
    if (excludeUserId && u.id === excludeUserId) continue;
    if (await verifyCode(code, u.code_hash)) return true;
  }
  return false;
}
