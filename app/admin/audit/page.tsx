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
        <p className="xwrap px-3 py-6 text-center text-sm text-slate-400">{d.common.noData}</p>
      ) : (
        <div className="xwrap">
          <table className="xtable">
            <thead>
              <tr>
                <th>Data</th>
                <th>Utilizator</th>
                <th>Acțiune</th>
                <th>Entitate</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap tabular-nums text-slate-500">
                    {dateTime(r.created_at)}
                  </td>
                  <td className="text-slate-800">{r.user?.full_name ?? d.common.none}</td>
                  <td>
                    <span className="cell-badge bg-slate-200 text-slate-600 font-mono">
                      {r.action}
                    </span>
                  </td>
                  <td className="text-slate-600">{r.entity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
