import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { getDict } from "@/lib/i18n/dictionaries";
import { getAdminDashboard, getAllCars } from "@/lib/db/queries";
import { dayRange } from "@/lib/utils/date";
import { carWorstExpiry, expiryClasses } from "@/lib/utils/expiry";
import { Icon, type IconName } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const s = await requireAdmin();
  const d = getDict(s.language_pref);

  const today = new Date();
  const stats = await getAdminDashboard(dayRange(today));
  const cars = await getAllCars().catch(() => []);

  const statCards: { label: string; value: string; danger?: boolean }[] = [
    { label: d.admin.studentsTotal, value: String(stats.studentsTotal) },
    { label: d.admin.groupsTotal, value: String(stats.groupsTotal) },
    { label: d.admin.lessonsToday, value: String(stats.lessonsToday) },
    { label: d.admin.noShowRate, value: stats.noShowRate + "%", danger: stats.noShowRate > 20 },
    { label: d.admin.cashToCollect, value: String(stats.cashToCollect) },
  ];

  const quickLinks: { href: string; label: string; icon: IconName }[] = [
    { href: "/admin/exams", label: d.nav.exams, icon: "exam" },
    { href: "/admin/instructors", label: d.nav.instructors, icon: "users" },
    { href: "/admin/operators", label: d.nav.operators, icon: "users" },
    { href: "/admin/theory-teachers", label: d.nav.theoryTeachers, icon: "teacher" },
    { href: "/admin/examiners", label: d.nav.examiners, icon: "award" },
    { href: "/admin/cars", label: d.nav.cars, icon: "car" },
    { href: "/admin/audit", label: d.nav.audit, icon: "history" },
    { href: "/admin/reports", label: d.nav.reports, icon: "report" },
  ];

  const carAlerts = cars.filter((c) => carWorstExpiry(c) !== "ok");
  const maxInstr = Math.max(1, ...stats.perInstructor.map((p) => p.count));

  return (
    <div className="space-y-6">
      <h1 className="page-title">{d.admin.dashboardTitle}</h1>

      {/* Statistici compacte */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
        {statCards.map((c) => (
          <div key={c.label} className="card flex flex-col gap-1">
            <span
              className={
                "text-2xl font-bold leading-none " +
                (c.danger ? "text-status-noshow" : "text-slate-900")
              }
            >
              {c.value}
            </span>
            <span className="text-xs font-medium text-slate-500">{c.label}</span>
          </div>
        ))}
      </div>

      {/* Acces rapid */}
      <section className="space-y-2">
        <h2 className="section-title">Acces rapid</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
          {quickLinks.map((q) => (
            <Link key={q.href} href={q.href} className="btn-secondary justify-start">
              <Icon name={q.icon} size={18} />
              <span className="truncate">{q.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Alerte documente mașini */}
      {carAlerts.length > 0 && (
        <section className="space-y-2">
          <h2 className="section-title flex items-center gap-2">
            <Icon name="alert" size={18} />
            Alerte documente mașini
          </h2>
          <ul className="space-y-2">
            {carAlerts.map((c) => {
              const level = carWorstExpiry(c);
              return (
                <li key={c.id}>
                  <Link
                    href={"/admin/cars"}
                    className={
                      "flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 " +
                      expiryClasses(level)
                    }
                  >
                    <span className="flex items-center gap-2 font-medium">
                      <Icon name="car" size={18} />
                      {c.plate} · {c.model}
                    </span>
                    <span className="text-xs font-semibold">
                      {level === "expired" ? d.cars.expired : d.cars.expiringSoon}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Lecții azi per instructor */}
      <section className="space-y-2">
        <h2 className="section-title">Lecții azi · instructor</h2>
        {stats.perInstructor.length === 0 ? (
          <p className="text-sm text-slate-400">{d.common.noData}</p>
        ) : (
          <ul className="card space-y-2.5">
            {stats.perInstructor.map((p) => (
              <li key={p.name} className="flex items-center gap-3">
                <span className="w-32 shrink-0 truncate text-sm text-slate-700">{p.name}</span>
                <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <span
                    className="block h-full rounded-full bg-brand"
                    style={{ width: Math.round((p.count / maxInstr) * 100) + "%" }}
                  />
                </span>
                <span className="w-6 shrink-0 text-right text-sm font-semibold text-slate-900">
                  {p.count}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
