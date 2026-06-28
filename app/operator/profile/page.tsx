import { requireOperator } from "@/lib/auth/session";
import { getDict } from "@/lib/i18n/dictionaries";
import { getUserNotifications } from "@/lib/db/queries";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { logoutAction } from "@/lib/auth/actions";
import { Icon } from "@/components/icons";
import { dateTime } from "@/lib/utils/date";

export const dynamic = "force-dynamic";

export default async function OperatorProfilePage() {
  const s = await requireOperator();
  const d = getDict(s.language_pref);
  const notifications = await getUserNotifications(s.id);

  const initials = s.full_name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="space-y-3">
      <h1 className="page-title">{d.nav.profile}</h1>

      <div className="card">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand font-bold">
            {initials}
          </span>
          <div>
            <h2 className="text-lg font-bold text-slate-900">{s.full_name}</h2>
            <p className="text-sm text-slate-500">{d.roles.operator}</p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
          <span className="text-sm font-medium text-slate-600">{d.lang.switch}</span>
          <LanguageSwitcher current={s.language_pref} />
        </div>
      </div>

      <div className="card">
        <h3 className="section-title mb-2.5 flex items-center gap-2">
          <Icon name="bell" size={16} /> {d.notif.title}
        </h3>
        {notifications.length === 0 ? (
          <p className="text-sm text-slate-400">{d.common.noData}</p>
        ) : (
          <ul className="space-y-3">
            {notifications.map((n: { id: string; body: string | null; created_at: string }) => (
              <li key={n.id} className="border-l-2 border-slate-200 pl-3">
                <p className="text-sm text-slate-700">{n.body ?? "—"}</p>
                <p className="text-xs text-slate-400 mt-0.5">{dateTime(n.created_at)}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form action={logoutAction}>
        <button type="submit" className="btn-secondary w-full">
          <Icon name="logout" size={16} /> {d.nav.logout}
        </button>
      </form>
    </div>
  );
}
