"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/provider";
import { Icon } from "@/components/icons";
import { dateDMY } from "@/lib/utils/date";
import { createGroupAction, setGroupArchivedAction } from "@/app/admin/actions/groups";
import type { GroupRow } from "@/lib/db/queries";

type SortKey = "soonest" | "newest" | "alpha";
export type TeacherOpt = { id: string; name: string };

export function GroupsClient({ groups, teachers }: { groups: GroupRow[]; teachers: TeacherOpt[] }) {
  const { d } = useI18n();
  const [adding, setAdding] = useState(false);
  const [view, setView] = useState<"active" | "archived">("active");
  const [sort, setSort] = useState<SortKey>("soonest");

  const list = useMemo(() => {
    const filtered = groups.filter((g) => (view === "archived" ? g.isArchived : !g.isArchived));
    const big = 9e9;
    return [...filtered].sort((a, b) => {
      if (sort === "alpha") return a.name.localeCompare(b.name);
      if (sort === "newest") return (b.start_date ?? b.created_at).localeCompare(a.start_date ?? a.created_at);
      // soonest: zile rămase crescător (fără termen la final)
      return (a.daysLeft ?? big) - (b.daysLeft ?? big);
    });
  }, [groups, view, sort]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="page-title">{d.groups.title}</h1>
        {!adding && (
          <button type="button" className="btn-primary" onClick={() => setAdding(true)}>
            <Icon name="plus" size={18} /> {d.groups.addNew}
          </button>
        )}
      </div>

      {adding && <GroupForm teachers={teachers} onClose={() => setAdding(false)} />}

      {/* Active / Arhivă + sortare */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-xl bg-slate-100 p-0.5">
          {(["active", "archived"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
                view === v ? "bg-white text-brand shadow-sm" : "text-slate-500"
              }`}
            >
              {v === "active" ? d.filters.active : d.filters.archive}
            </button>
          ))}
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="input h-9 w-auto py-0 text-sm"
        >
          <option value="soonest">{d.filters.soonest}</option>
          <option value="newest">{d.filters.newest}</option>
          <option value="alpha">{d.filters.alpha}</option>
        </select>
      </div>

      {list.length === 0 ? (
        <p className="xwrap px-3 py-6 text-center text-sm text-slate-400">{d.common.noData}</p>
      ) : (
        <div className="xwrap">
          <table className="xtable">
            <thead>
              <tr>
                <th>{d.groups.name}</th>
                <th className="td-num">{d.nav.students}</th>
                <th>{d.filters.period}</th>
                <th>{d.filters.daysLeft.replace("{n}", "").trim() || "—"}</th>
                <th>{d.filters.archive}</th>
              </tr>
            </thead>
            <tbody>
              {list.map((g) => (
                <GroupRow key={g.id} group={g} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function GroupRow({ group: g }: { group: GroupRow }) {
  const { d, fmt } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();

  // Insignă „zile rămase".
  let daysText: string = d.filters.noEnd;
  let daysCls: string = "bg-slate-100 text-slate-500";
  if (g.isArchived) {
    daysText = g.daysLeft != null && g.daysLeft < 0 ? d.filters.expired : d.filters.archived;
    daysCls = "bg-slate-200 text-slate-600";
  } else if (g.daysLeft != null) {
    daysText = fmt(d.filters.daysLeft, { n: g.daysLeft });
    daysCls =
      g.daysLeft <= 3
        ? "bg-status-noshow/10 text-status-noshow"
        : g.daysLeft <= 10
        ? "bg-amber-100 text-amber-700"
        : "bg-emerald-50 text-emerald-700";
  }

  function toggleArchive() {
    start(async () => {
      await setGroupArchivedAction(g.id, !g.archived);
      router.refresh();
    });
  }

  return (
    <tr className="row-link" onClick={() => router.push("/admin/groups/" + g.id)}>
      <td className="font-semibold text-slate-900">{g.name}</td>
      <td className="td-num">{g.studentCount}</td>
      <td>
        {g.start_date || g.end_date
          ? `${g.start_date ? dateDMY(g.start_date + "T00:00:00Z") : "…"} – ${
              g.end_date ? dateDMY(g.end_date + "T00:00:00Z") : "…"
            }`
          : "—"}
      </td>
      <td>
        <span className={"cell-badge " + daysCls}>{daysText}</span>
      </td>
      <td>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleArchive();
          }}
          disabled={pending}
          className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-brand"
        >
          <Icon name={g.archived ? "history" : "download"} size={15} />
          {g.archived ? d.filters.unarchive : d.filters.archiveNow}
        </button>
      </td>
    </tr>
  );
}

function GroupForm({ teachers, onClose }: { teachers: TeacherOpt[]; onClose: () => void }) {
  const { d } = useI18n();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const res = await createGroupAction(new FormData(e.currentTarget));
    setBusy(false);
    if (res.ok) {
      router.refresh();
      onClose();
    } else {
      setError(res.error === "invalid_dates" ? "Interval invalid (final înainte de început)." : d.common.error);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-3 border-brand-100">
      <h2 className="section-title">{d.groups.addNew}</h2>
      <div>
        <label className="label" htmlFor="name">{d.groups.name}</label>
        <input id="name" name="name" className="input" required />
      </div>
      <div>
        <label className="label" htmlFor="theory_teacher_id">{d.students.theoryTeacher}</label>
        <select id="theory_teacher_id" name="theory_teacher_id" className="input" defaultValue="">
          <option value="">{d.common.none}</option>
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        {teachers.length === 0 && (
          <p className="mt-1 text-xs text-slate-400">{d.nav.theoryTeachers}: —</p>
        )}
      </div>
      <div>
        <label className="label">{d.filters.period}</label>
        <div className="flex items-center gap-2">
          <input name="start_date" type="date" className="input" aria-label={d.filters.from} />
          <span className="text-slate-400">–</span>
          <input name="end_date" type="date" className="input" aria-label={d.filters.to} />
        </div>
        <p className="mt-1 text-xs text-slate-400">După data de final, grupa trece automat în arhivă.</p>
      </div>
      {error && <p className="text-sm text-status-noshow">{error}</p>}
      <div className="flex items-center gap-2 pt-1">
        <button type="submit" disabled={busy} className="btn-primary">{busy ? d.common.loading : d.common.save}</button>
        <button type="button" className="btn-secondary" onClick={onClose} disabled={busy}>{d.common.cancel}</button>
      </div>
    </form>
  );
}
