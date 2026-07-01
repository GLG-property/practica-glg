"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
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

  // Grupele prezente (pentru filtrul după grupă).
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
      return p === "behind" || p === "critical"; // „în urmă" include și „risc"
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
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="page-title">{d.students.title}</h1>
        <Link href="/admin/students/new" className="btn-primary">
          <Icon name="plus" size={18} /> {d.students.addNew}
        </Link>
      </div>

      {/* Active / Arhivă */}
      <div className="flex rounded-xl bg-slate-100 p-0.5 w-fit">
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

      {/* Căutare */}
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          <Icon name="search" size={18} />
        </span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={d.students.searchPlaceholder}
          className="input pl-10"
        />
      </div>

      {/* Filtre: grupă, vârstă, ritm, sortare */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <select value={groupId} onChange={(e) => setGroupId(e.target.value)} className="input h-9 py-0 text-sm">
          <option value="">{d.filters.group}: {d.filters.all}</option>
          {groupOptions.map(([id, name]) => (
            <option key={id} value={id}>{name}</option>
          ))}
        </select>
        <select value={ageBucket} onChange={(e) => setAgeBucket(e.target.value as AgeBucket)} className="input h-9 py-0 text-sm">
          <option value="all">{d.filters.age}: {d.filters.all}</option>
          <option value="u25">{d.filters.ageU25}</option>
          <option value="m">{d.filters.age2540}</option>
          <option value="o40">{d.filters.ageO40}</option>
        </select>
        <select value={pace} onChange={(e) => setPace(e.target.value as PaceFilter)} className="input h-9 py-0 text-sm">
          <option value="all">{d.pace.label}: {d.filters.all}</option>
          <option value="behind">{d.pace.behind}</option>
          <option value="critical">{d.pace.critical}</option>
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="input h-9 py-0 text-sm">
          <option value="alpha">{d.filters.sort}: {d.filters.alpha}</option>
          <option value="daysLeft">{d.filters.sort}: {d.filters.daysLeftSort}</option>
        </select>
      </div>

      <p className="text-xs text-slate-400">{list.length} cursanți</p>

      {list.length === 0 ? (
        <p className="card text-sm text-slate-400">{d.common.noData}</p>
      ) : (
        <ul className="space-y-2">
          {list.map((s) => (
            <li key={s.id}>
              <StudentRow s={s} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StudentRow({ s }: { s: AdminStudentRow }) {
  const { d, fmt } = useI18n();

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
    <Link href={"/admin/students/" + s.id} className="card flex items-center justify-between gap-3 hover:border-brand/40">
      <div className="min-w-0">
        <p className="truncate font-semibold text-slate-900">{studentName(s)}</p>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-slate-500">
          <span>{s.transmission === "manual" ? d.students.manual : d.students.automatic}</span>
          {s.group_name && <span>· {s.group_name}</span>}
          {s.age != null && <span>· {s.age} {d.filters.years}</span>}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {s.pace === "critical" && (
          <span className="rounded-lg bg-status-noshow/10 px-2 py-1 text-xs font-semibold text-status-noshow">
            {d.pace.critical}
          </span>
        )}
        {s.pace === "behind" && (
          <span className="rounded-lg bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">
            {d.pace.behind}
          </span>
        )}
        {daysText && <span className={`rounded-lg px-2 py-1 text-xs font-semibold ${daysCls}`}>{daysText}</span>}
        <Icon name="next" size={18} className="text-slate-400" />
      </div>
    </Link>
  );
}
