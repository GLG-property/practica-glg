"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/provider";
import { Icon } from "@/components/icons";
import { studentName } from "@/lib/db/types";
import type { AdminStudentRow } from "@/lib/db/queries";

type SortKey = "alpha" | "daysLeft";
type AgeBucket = "all" | "u25" | "m" | "o40";
type PaceFilter = "all" | "behind" | "critical";

export function StudentsListClient({ students }: { students: AdminStudentRow[] }) {
  const { d } = useI18n();
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"active" | "archived">("active");
  const [groupId, setGroupId] = useState("");
  const [ageBucket, setAgeBucket] = useState<AgeBucket>("all");
  const [pace, setPace] = useState<PaceFilter>("all");
  const [sort, setSort] = useState<SortKey>("alpha");

  const groupOptions = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of students) if (s.group_id && s.group_name) m.set(s.group_id, s.group_name);
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [students]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const inAge = (age: number | null) => {
      if (ageBucket === "all") return true;
      if (age == null) return false;
      if (ageBucket === "u25") return age < 25;
      if (ageBucket === "m") return age >= 25 && age <= 40;
      return age > 40;
    };
    const inPace = (p: AdminStudentRow["pace"]) => {
      if (pace === "all") return true;
      if (pace === "critical") return p === "critical";
      return p === "behind" || p === "critical";
    };
    const filtered = students.filter(
      (s) =>
        (view === "archived" ? s.isArchived : !s.isArchived) &&
        (!groupId || s.group_id === groupId) &&
        inAge(s.age) &&
        inPace(s.pace) &&
        (!q || studentName(s).toLowerCase().includes(q))
    );
    const big = 9e9;
    return [...filtered].sort((a, b) =>
      sort === "alpha"
        ? studentName(a).localeCompare(studentName(b))
        : (a.daysLeft ?? big) - (b.daysLeft ?? big)
    );
  }, [students, query, view, groupId, ageBucket, pace, sort]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h1 className="page-title">{d.students.title}</h1>
        <Link href="/admin/students/new" className="btn-primary">
          <Icon name="plus" size={18} /> {d.students.addNew}
        </Link>
      </div>

      {/* Bara de instrumente: activ/arhivă, căutare, filtre — compactă */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg bg-slate-100 p-0.5">
          {(["active", "archived"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
                view === v ? "bg-white text-brand shadow-sm" : "text-slate-500"
              }`}
            >
              {v === "active" ? d.filters.active : d.filters.archive}
            </button>
          ))}
        </div>

        <div className="relative min-w-[10rem] flex-1">
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400">
            <Icon name="search" size={16} />
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={d.students.searchPlaceholder}
            className="input h-9 py-0 pl-8 text-sm"
          />
        </div>

        <select value={groupId} onChange={(e) => setGroupId(e.target.value)} className="input h-9 w-auto py-0 text-sm">
          <option value="">{d.filters.group}: {d.filters.all}</option>
          {groupOptions.map(([id, name]) => (
            <option key={id} value={id}>{name}</option>
          ))}
        </select>
        <select value={ageBucket} onChange={(e) => setAgeBucket(e.target.value as AgeBucket)} className="input h-9 w-auto py-0 text-sm">
          <option value="all">{d.filters.age}: {d.filters.all}</option>
          <option value="u25">{d.filters.ageU25}</option>
          <option value="m">{d.filters.age2540}</option>
          <option value="o40">{d.filters.ageO40}</option>
        </select>
        <select value={pace} onChange={(e) => setPace(e.target.value as PaceFilter)} className="input h-9 w-auto py-0 text-sm">
          <option value="all">{d.pace.label}: {d.filters.all}</option>
          <option value="behind">{d.pace.behind}</option>
          <option value="critical">{d.pace.critical}</option>
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="input h-9 w-auto py-0 text-sm">
          <option value="alpha">{d.filters.alpha}</option>
          <option value="daysLeft">{d.filters.daysLeftSort}</option>
        </select>
      </div>

      <p className="text-xs text-slate-400">{list.length}</p>

      {list.length === 0 ? (
        <p className="xwrap px-3 py-6 text-center text-sm text-slate-400">{d.common.noData}</p>
      ) : (
        <div className="xwrap">
          <table className="xtable">
            <thead>
              <tr>
                <th>{d.students.lastName}</th>
                <th>{d.students.transmission}</th>
                <th>{d.filters.group}</th>
                <th className="td-num">{d.filters.age}</th>
                <th>{d.pace.label}</th>
                <th>{d.filters.daysLeft.replace("{n}", "").trim() || "—"}</th>
              </tr>
            </thead>
            <tbody>
              {list.map((s) => (
                <StudentRow key={s.id} s={s} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StudentRow({ s }: { s: AdminStudentRow }) {
  const { d, fmt } = useI18n();
  const router = useRouter();

  let daysText = "";
  let daysCls = "";
  if (s.group_id) {
    if (s.isArchived) {
      daysText = s.daysLeft != null && s.daysLeft < 0 ? d.filters.expired : d.filters.archived;
      daysCls = "bg-slate-200 text-slate-600";
    } else if (s.daysLeft != null) {
      daysText = fmt(d.filters.daysLeft, { n: s.daysLeft });
      daysCls =
        s.daysLeft <= 3
          ? "bg-status-noshow/10 text-status-noshow"
          : s.daysLeft <= 10
          ? "bg-amber-100 text-amber-700"
          : "bg-emerald-50 text-emerald-700";
    }
  }

  return (
    <tr className="row-link" onClick={() => router.push("/admin/students/" + s.id)}>
      <td className="font-semibold text-slate-900">{studentName(s)}</td>
      <td>{s.transmission === "manual" ? d.students.manual : d.students.automatic}</td>
      <td>{s.group_name ?? "—"}</td>
      <td className="td-num">{s.age ?? "—"}</td>
      <td>
        {s.pace === "critical" ? (
          <span className="cell-badge bg-status-noshow/10 text-status-noshow">{d.pace.critical}</span>
        ) : s.pace === "behind" ? (
          <span className="cell-badge bg-amber-100 text-amber-700">{d.pace.behind}</span>
        ) : (
          <span className="text-slate-300">—</span>
        )}
      </td>
      <td>
        {daysText ? <span className={"cell-badge " + daysCls}>{daysText}</span> : <span className="text-slate-300">—</span>}
      </td>
    </tr>
  );
}
