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

      {/* Listă per instructor */}
      {recon.length === 0 ? (
        <p className="text-sm text-slate-400">{d.common.noData}</p>
      ) : (
        <ul className="space-y-3">
          {recon.map((line) => (
            <li key={line.instructorId}>
              <details className="card group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                  <span className="flex items-center gap-2 font-semibold text-slate-900">
                    <Icon name="users" size={18} />
                    {line.instructorName}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-status-completed/15 px-2.5 py-0.5 text-sm font-bold text-status-completed">
                      {line.count}
                    </span>
                    <Icon name="next" size={16} />
                  </span>
                </summary>
                <ul className="mt-3 space-y-1.5 border-t border-slate-100 pt-3">
                  {line.lessons.map((l) => (
                    <li
                      key={l.id}
                      className="flex items-center justify-between gap-3 text-sm text-slate-600"
                    >
                      <span className="tabular-nums text-slate-500">
                        {dateDMY(l.start_time)} · {timeHM(l.start_time)}
                      </span>
                      <span className="truncate font-medium text-slate-800">
                        {l.student ? studentName(l.student) : d.common.none}
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
