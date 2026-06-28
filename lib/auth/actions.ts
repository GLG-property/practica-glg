"use server";

import { redirect } from "next/navigation";
import { destroySession, getSession, createSession } from "@/lib/auth/session";
import { audit } from "@/lib/db/audit";
import { getAdminClient } from "@/lib/supabase/admin";
import type { LangPref } from "@/lib/db/types";

export async function logoutAction(): Promise<void> {
  const session = await getSession();
  if (session) {
    await audit({ userId: session.id, action: "auth.logout", entity: "user", entityId: session.id });
  }
  await destroySession();
  redirect("/login");
}

export async function setLanguageAction(lang: LangPref): Promise<void> {
  const session = await getSession();
  if (!session) return;
  if (lang !== "ro" && lang !== "ru") return;
  const supabase = getAdminClient();
  await supabase.from("users").update({ language_pref: lang }).eq("id", session.id);
  await createSession({ ...session, language_pref: lang });
}
