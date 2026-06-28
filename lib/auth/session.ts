import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import type { SessionUser, UserRole } from "@/lib/db/types";

const COOKIE_NAME = "glg_session";
// Sesiune persistentă: instructorii/operatorii nu trebuie să se logheze zilnic.
const MAX_AGE_SECONDS = 60 * 60 * 24 * 60; // 60 de zile

function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "SESSION_SECRET lipsește sau e prea scurt. Setează-l în .env.local (min. 16 caractere)."
    );
  }
  return new TextEncoder().encode(secret);
}

export async function createSession(user: SessionUser): Promise<void> {
  const token = await new SignJWT({
    sub: user.id,
    full_name: user.full_name,
    role: user.role,
    language_pref: user.language_pref,
    assigned_car_id: user.assigned_car_id,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(getSecret());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: ["HS256"] });
    return {
      id: String(payload.sub),
      full_name: String(payload.full_name),
      role: payload.role as UserRole,
      language_pref: payload.language_pref as SessionUser["language_pref"],
      assigned_car_id: (payload.assigned_car_id as string | null) ?? null,
    };
  } catch {
    return null;
  }
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSession();
  if (!user) throw new Error("UNAUTHENTICATED");
  return user;
}

export async function requireRole(...roles: UserRole[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) throw new Error("FORBIDDEN");
  return user;
}

export const requireAdmin = () => requireRole("admin");
export const requireOperator = () => requireRole("operator");
export const requireInstructor = () => requireRole("instructor");

export { COOKIE_NAME };
