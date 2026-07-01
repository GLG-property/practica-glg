import { requireAdmin } from "@/lib/auth/session";
import { getDict } from "@/lib/i18n/dictionaries";
import { getReconciliation } from "@/lib/db/queries";
import { weekRange, dateDMY, timeHM, combineDateTime, isoToYmd } from "@/lib/utils/date";
import { studentName } from "@/lib/db/types";
import { Icon } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const s = await requireAdmin();
  const d = getDict(s.language_pref);
  const sp = await searchParams;

  const wr = weekRange(new Date());
  const isDate = (v?: string) => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);
  const fromStr = isDate(sp.from) ? sp.from! : isoToYmd(wr.start);
  const toStr = isDate(sp.to) ? sp.to! : isoToYmd(wr.end);

  // Limite în fusul afacerii (consistent cu stocarea).
  const start = combineDateTime(fromStr, "00:00");
  const end = combineDateTime(toStr, "23:59");

  const recon = await getReconciliation({ start, end });
  const grandTotal = recon.reduce((a, l) => a + l.count, 0);

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h1 className="page-title">{d.payment.reconciliation}</h1>
        <p className="text-sm text-slate-500">{d.payment.byInstructor}</p>
      </header>

      {/* Filtru interval */}
      <form method="get" className="card flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="label" htmlFor="from">
            {d.admin.from}
          </label>
          <input id="from" name="from" type="date" defaultValue={fromStr} className="input" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="label" htmlFor="to">
            {d.admin.to}
          </label>
          <input id="to" name="to" type="date" defaultValue={toStr} className="input" />
        </div>
        <button type="submit" className="btn-primary min-h-tap">
          <Icon name="search" size={18} />
          <span>{d.common.search}</span>
        </button>
      </form>

      {/* Total general */}
      <div className="card flex items-center justify-between bg-brand-50">
        <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <Icon name="clock" size={18} />
          {d.payment.cashCollected}
        </span>
        <span className="text-2xl font-bold leading-none text-brand">{grandTotal}</span>
      </div>

      {/* Listă per instructor — tabele compacte tip Excel */}
      {recon.length === 0 ? (
        <p className="xwrap px-3 py-6 text-center text-sm text-slate-400">{d.common.noData}</p>
      ) : (
        <div className="space-y-4">
          {recon.map((line) => (
            <section key={line.instructorId} className="space-y-1.5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Icon name="users" size={18} />
                  {line.instructorName}
                </h2>
                <span className="cell-badge bg-status-completed/15 text-status-completed">
                  {line.count}
                </span>
              </div>
              <div className="xwrap">
                <table className="xtable">
                  <thead>
                    <tr>
                      <th>{d.lesson.date}</th>
                      <th>{d.lesson.startTime}</th>
                      <th>{d.lesson.student}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {line.lessons.map((l) => (
                      <tr key={l.id}>
                        <td className="tabular-nums text-slate-600">{dateDMY(l.start_time)}</td>
                        <td className="tabular-nums text-slate-600">{timeHM(l.start_time)}</td>
                        <td className="font-medium text-slate-800">
                          {l.student ? studentName(l.student) : d.common.none}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
