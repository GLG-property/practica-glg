import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { logoutAction } from "@/lib/auth/actions";
import { Icon } from "@/components/icons";
import type { LangPref } from "@/lib/db/types";

/** Bară de sus: titlu, comutator limbă, buton ieșire. */
export function TopBar({
  title,
  lang,
  logoutLabel,
}: {
  title: string;
  lang: LangPref;
  logoutLabel: string;
}) {
  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-200 px-4 py-2.5 flex items-center justify-between gap-3 pt-[max(0.625rem,env(safe-area-inset-top))]">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white text-xs font-bold">
          GLG
        </span>
        <h1 className="text-base font-semibold text-slate-900 truncate">{title}</h1>
      </div>
      <div className="flex items-center gap-2">
        <LanguageSwitcher current={lang} />
        <form action={logoutAction}>
          <button
            type="submit"
            className="inline-flex items-center justify-center h-9 w-9 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            title={logoutLabel}
            aria-label={logoutLabel}
          >
            <Icon name="logout" size={18} />
          </button>
        </form>
      </div>
    </header>
  );
}
