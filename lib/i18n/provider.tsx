"use client";

import { createContext, useContext } from "react";
import type { LangPref } from "@/lib/db/types";
import { dictionaries, fmt, type Dict } from "@/lib/i18n/dictionaries";

interface I18nContextValue {
  lang: LangPref;
  d: Dict;
  fmt: typeof fmt;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  lang,
  children,
}: {
  lang: LangPref;
  children: React.ReactNode;
}) {
  const d = (dictionaries[lang] ?? dictionaries.ro) as Dict;
  return (
    <I18nContext.Provider value={{ lang, d, fmt }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Fallback sigur dacă lipsește provider-ul (nu ar trebui să se întâmple).
    return { lang: "ro", d: dictionaries.ro, fmt };
  }
  return ctx;
}
