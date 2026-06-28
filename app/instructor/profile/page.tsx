import { requireInstructor } from "@/lib/auth/session";
import { getDict } from "@/lib/i18n/dictionaries";
import { getCarById, getUserNotifications } from "@/lib/db/queries";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { logoutAction } from "@/lib/auth/actions";
import { Icon } from "@/components/icons";
import { dateDMY, dateTime } from "@/lib/utils/date";
import { expiryLevel, expiryClasses } from "@/lib/utils/expiry";

export const dynamic = "force-dynamic";

export default async function InstructorProfilePage() {
  const s = await requireInstructor();
  const d = getDict(s.language_pref);

  const [car, notifications] = await Promise.all([
    getCarById(s.assigned_car_id),
    getUserNotifications(s.id).catch(() => [] as never[]),
  ]);

  const expiries = car
    ? [
        { label: d.cars.itp, date: car.itp_expiry },
        { label: d.cars.insurance, date: car.insurance_expiry },
        { label: d.cars.service, date: car.service_due },
      ]
    : [];

  const initials = s.full_name
    .split(/\s+/)
    .map((w) => w[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="space-y-3">
      <h1 className="page-title">{d.nav.profile}</h1>

      {/* Identitate + limbă */}
      <div className="card">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 font-bold text-brand">
            {initials}
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold text-slate-900">{s.full_name}</h2>
            <p className="text-sm text-slate-500">{d.roles.instructor}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-600">{d.lang.switch}</span>
          <LanguageSwitcher current={s.language_pref} />
        </div>
      </div>

      {/* Mașina atribuită */}
      <div className="card">
        <h3 className="section-title mb-2.5 flex items-center gap-2">
          <Icon name="car" size={16} /> {d.instructors.car}
        </h3>
        {car ? (
          <div className="space-y-2.5">
            <div>
              <p className="text-base font-semibold text-slate-900">
                {car.model} <span className="font-normal text-slate-500">({car.plate})</span>
              </p>
              <p className="text-sm text-slate-500">
                {car.transmission === "manual" ? d.students.manual : d.students.automatic}
                {" · "}
                {car.stage === "beginner" ? d.cars.beginner : d.cars.advanced}
              </p>
            </div>
            <ul className="grid grid-cols-3 gap-2">
              {expiries.map((ex) => (
                <li
                  key={ex.label}
                  className={`rounded-xl border px-2 py-2 text-center ${expiryClasses(expiryLevel(ex.date))}`}
                >
                  <p className="text-[11px] font-semibold uppercase tracking-wide opacity-80">
                    {ex.label}
                  </p>
                  <p className="mt-0.5 text-sm font-bold">
                    {ex.date ? dateDMY(ex.date) : d.common.none}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-sm text-slate-400">{d.common.none}</p>
        )}
      </div>

      {/* Notificări in-app */}
      <div className="card">
        <h3 className="section-title mb-2.5 flex items-center gap-2">
          <Icon name="bell" size={16} /> {d.notif.title}
        </h3>
        {(notifications as { id: string; body: string | null; created_at: string }[]).length === 0 ? (
          <p className="text-sm text-slate-400">{d.common.noData}</p>
        ) : (
          <ul className="space-y-3">
            {(notifications as { id: string; body: string | null; created_at: string }[]).map((n) => (
              <li key={n.id} className="border-l-2 border-slate-200 pl-3">
                <p className="text-sm text-slate-700">{n.body ?? d.common.none}</p>
                <p className="mt-0.5 text-xs text-slate-400">{dateTime(n.created_at)}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Ieșire */}
      <form action={logoutAction}>
        <button type="submit" className="btn-secondary w-full">
          <Icon name="logout" size={16} /> {d.nav.logout}
        </button>
      </form>
    </div>
  );
}
