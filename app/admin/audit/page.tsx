import { requireAdmin } from "@/lib/auth/session";
import { getDict } from "@/lib/i18n/dictionaries";
import { getAuditLog } from "@/lib/db/queries";
import { dateTime } from "@/lib/utils/date";
import { Icon } from "@/components/icons";
import type { AuditLogRow } from "@/lib/db/types";

export const dynamic = "force-dynamic";

type AuditRow = AuditLogRow & { user?: { full_name: string } | null };

export default async function AdminAuditPage() {
  const s = await requireAdmin();
  const d = getDict(s.language_pref);

  const rows = (await getAuditLog(200)) as unknown as AuditRow[];

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h1 className="page-title flex items-center gap-2">
          <Icon name="history" size={22} />
          {d.admin.auditTitle}
        </h1>
        <p className="text-sm text-slate-500">Ultimele {rows.length} acțiuni</p>
      </header>

      {rows.length === 0 ? (
        <p className="text-sm text-slate-400">{d.common.noData}</p>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2 font-semibold">Data</th>
                <th className="px-3 py-2 font-semibold">Utilizator</th>
                <th className="px-3 py-2 font-semibold">Acțiune</th>
                <th className="px-3 py-2 font-semibold">Entitate</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-slate-50 last:border-0">
                  <td className="whitespace-nowrap px-3 py-2 tabular-nums text-slate-500">
                    {dateTime(r.created_at)}
                  </td>
                  <td className="px-3 py-2 text-slate-800">
                    {r.user?.full_name ?? d.common.none}
                  </td>
                  <td className="px-3 py-2">
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-700">
                      {r.action}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-600">{r.entity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
