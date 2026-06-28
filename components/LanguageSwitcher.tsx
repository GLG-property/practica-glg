"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { LangPref } from "@/lib/db/types";
import { setLanguageAction } from "@/lib/auth/actions";

/** Comutator RO/RU; salvează preferința în DB și reîmprospătează pagina. */
export function LanguageSwitcher({ current }: { current: LangPref }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function change(lang: LangPref) {
    if (lang === current || pending) return;
    startTransition(async () => {
      await setLanguageAction(lang);
      router.refresh();
    });
  }

  return (
    <div className="flex gap-0.5 rounded-lg bg-slate-100 p-0.5" aria-label="Limbă / Язык">
      {(["ro", "ru"] as LangPref[]).map((l) => (
        <button
          key={l}
          onClick={() => change(l)}
          disabled={pending}
          className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors ${
            current === l ? "bg-white text-brand shadow-sm" : "text-slate-500"
          }`}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
