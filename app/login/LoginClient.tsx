"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { dictionaries, fmt } from "@/lib/i18n/dictionaries";
import { Icon, type IconName } from "@/components/icons";
import { PinKeypad } from "@/components/PinKeypad";
import { homePathForRole } from "@/lib/auth/routes";
import type { LangPref, UserRole } from "@/lib/db/types";
import { loginAction } from "./actions";

const ROLES: { role: UserRole; icon: IconName }[] = [
  { role: "instructor", icon: "car" },
  { role: "operator", icon: "calendar" },
  { role: "admin", icon: "settings" },
];

export function LoginClient() {
  const router = useRouter();
  const [lang, setLang] = useState<LangPref>("ro");
  const [role, setRole] = useState<UserRole | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const d = dictionaries[lang];
  const codeLen = role === "admin" ? 8 : 5;

  async function submit(code: string) {
    if (!role || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await loginAction({ role, code });
      if (res.ok) {
        router.replace(homePathForRole(res.role));
        router.refresh();
        return;
      }
      if (res.reason === "wrong") setError(fmt(d.login.wrongCode, { n: res.attemptsLeft }));
      else if (res.reason === "locked") setError(fmt(d.login.locked, { min: res.minutes }));
      else if (res.reason === "config")
        setError(
          "Configurare server incompletă: lipsesc variabilele de mediu (SUPABASE_* / SESSION_SECRET) în Vercel."
        );
      else setError(d.common.error);
    } catch {
      setError(d.common.error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-10">
      <div className="w-full max-w-sm flex items-center justify-between mb-8">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="GLG Property" className="h-10 w-10 object-contain" />
          <h1 className="text-lg font-bold text-slate-900">{d.appName}</h1>
        </div>
        <div className="flex gap-0.5 rounded-lg bg-slate-100 p-0.5">
          {(["ro", "ru"] as LangPref[]).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                lang === l ? "bg-white text-brand shadow-sm" : "text-slate-500"
              }`}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {!role ? (
        <div className="w-full max-w-sm">
          <h2 className="text-base font-semibold text-slate-500 mb-4 text-center">
            {d.login.chooseRole}
          </h2>
          <div className="space-y-3">
            {ROLES.map(({ role: r, icon }) => (
              <button
                key={r}
                onClick={() => {
                  setRole(r);
                  setError(null);
                }}
                className="w-full card flex items-center gap-4 hover:border-brand/40 py-4"
              >
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand">
                  <Icon name={icon} size={24} />
                </span>
                <span className="text-lg font-semibold text-slate-900">{d.roles[r]}</span>
                <Icon name="next" size={20} className="ml-auto text-slate-300" />
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="w-full max-w-sm flex flex-col items-center">
          <button
            onClick={() => {
              setRole(null);
              setError(null);
            }}
            className="self-start inline-flex items-center gap-1 text-sm font-medium text-brand mb-4"
          >
            <Icon name="back" size={16} /> {d.common.back}
          </button>
          <div className="text-center mb-2">
            <p className="text-xl font-bold text-slate-900">{d.roles[role]}</p>
            <p className="text-sm text-slate-500">
              {role === "admin" ? d.login.codeHint8 : d.login.codeHint5}
            </p>
          </div>
          <PinKeypad
            length={codeLen}
            onComplete={submit}
            busy={busy}
            error={error}
            labels={{ clear: d.login.clear, enter: d.login.enter }}
          />
        </div>
      )}
    </main>
  );
}
