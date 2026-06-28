import { requireAdmin } from "@/lib/auth/session";
import { getDict } from "@/lib/i18n/dictionaries";
import { getReportData, STATUS_LABEL_RO, PAYMENT_LABEL_RO } from "@/lib/reports/data";
import { getAllInstructors } from "@/lib/db/queries";
import { isPaid } from "@/lib/payments";
import { StatusBadge } from "@/components/StatusBadge";
import { Icon } from "@/components/icons";

export const dynamic = "force-dynamic";

const PREVIEW_LIMIT = 100;

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; instructor?: string }>;
}) {
  const s = await requireAdmin();
  const d = getDict(s.language_pref);
  const sp = await searchParams;

  const instructorId = sp.instructor && sp.instructor.trim() ? sp.instructor.trim() : "";

  const [report, instructors] = await Promise.all([
    getReportData({ from: sp.from, to: sp.to, instructorId: instructorId || undefined }),
    getAllInstructors(),
  ]);

  // Construim query string din intervalul rezolvat + instructor.
  const qs = new URLSearchParams();
  qs.set("from", report.range.from);
  qs.set("to", report.range.to);
  if (instructorId) qs.set("instructor", instructorId);
  const query = qs.toString();

  const cards: { label: string; value: string; danger?: boolean }[] = [
    { label: "Total", value: String(report.summary.total) },
    { label: d.status.completed, value: String(report.summary.completed) },
    {
      label: d.status.no_show,
      value: String(report.summary.no_show),
      danger: report.summary.no_show > 0,
    },
    {
      label: d.payment.unpaid,
      value: String(report.summary.unpaid),
      danger: report.summary.unpaid > 0,
    },
    { label: d.payment.cashCollected, value: String(report.summary.cashByInstructor) },
    {
      label: d.admin.noShowRate,
      value: report.summary.noShowRate + "%",
      danger: report.summary.noShowRate > 20,
    },
  ];

  const previewRows = report.rows.slice(0, PREVIEW_LIMIT);

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h1 className="page-title">{d.admin.reportsTitle}</h1>
        <p className="text-sm text-slate-500">
          {report.range.from} → {report.range.to}
        </p>
      </header>

      {/* Filtre */}
      <form method="get" className="card flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="label" htmlFor="from">
            {d.admin.from}
          </label>
          <input
            id="from"
            name="from"
            type="date"
            defaultValue={report.range.from}
            className="input"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="label" htmlFor="to">
            {d.admin.to}
          </label>
          <input id="to" name="to" type="date" defaultValue={report.range.to} className="input" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="label" htmlFor="instructor">
            {d.admin.filterInstructor}
          </label>
          <select
            id="instructor"
            name="instructor"
            defaultValue={instructorId}
            className="input min-w-44"
          >
            <option value="">{d.common.all}</option>
            {instructors.map((i) => (
              <option key={i.id} value={i.id}>
                {i.full_name}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn-primary min-h-tap">
          <Icon name="search" size={18} />
          <span>{d.common.search}</span>
        </button>
      </form>

      {/* Descărcări */}
      <div className="flex flex-wrap gap-2">
        <a href={"/api/reports/excel?" + query} className="btn-success min-h-tap">
          <Icon name="download" size={18} />
          <span>{d.admin.exportExcel}</span>
        </a>
        <a href={"/api/reports/pdf?" + query} className="btn-secondary min-h-tap">
          <Icon name="download" size={18} />
          <span>{d.admin.exportPdf}</span>
        </a>
      </div>

      {/* Sumar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
        {cards.map((c) => (
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

      {/* Previzualizare */}
      <section className="space-y-2">
        <h2 className="section-title flex items-center gap-2">
          <Icon name="report" size={18} />
          Previzualizare
        </h2>
        {report.rows.length === 0 ? (
          <p className="text-sm text-slate-400">{d.common.noData}</p>
        ) : (
          <div className="card overflow-x-auto p-0">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-2 font-semibold">{d.lesson.date}</th>
                  <th className="px-3 py-2 font-semibold">{d.lesson.startTime}</th>
                  <th className="px-3 py-2 font-semibold">{d.lesson.instructor}</th>
                  <th className="px-3 py-2 font-semibold">{d.lesson.student}</th>
                  <th className="px-3 py-2 font-semibold">{d.lesson.car}</th>
                  <th className="px-3 py-2 font-semibold">{d.lesson.phase}</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                  <th className="px-3 py-2 font-semibold">Plată</th>
                </tr>
              </thead>
              <tbody>
                {previewRows.map((r, idx) => (
                  <tr key={idx} className="border-b border-slate-50 last:border-0">
                    <td className="whitespace-nowrap px-3 py-2 tabular-nums text-slate-600">
                      {r.date}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 tabular-nums text-slate-600">
                      {r.time}
                    </td>
                    <td className="px-3 py-2 text-slate-800">{r.instructor}</td>
                    <td className="px-3 py-2 font-medium text-slate-900">{r.student}</td>
                    <td className="px-3 py-2 text-slate-600">{r.car}</td>
                    <td className="px-3 py-2 text-slate-600">{r.phase}</td>
                    <td className="px-3 py-2">
                      <StatusBadge status={r.status} label={STATUS_LABEL_RO[r.status]} />
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={
                          "text-xs font-semibold " +
                          (isPaid(r.payment) ? "text-status-completed" : "text-status-noshow")
                        }
                      >
                        {PAYMENT_LABEL_RO[r.payment]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {report.rows.length > PREVIEW_LIMIT && (
          <p className="text-xs text-slate-400">
            Se afișează primele {PREVIEW_LIMIT} din {report.rows.length} lecții. Descarcă fișierul
            pentru lista completă.
          </p>
        )}
      </section>
    </div>
  );
}
