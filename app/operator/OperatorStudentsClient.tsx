"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/provider";
import { Icon } from "@/components/icons";
import type { Transmission } from "@/lib/db/types";

export interface OperatorStudentRow {
  id: string;
  name: string;
  transmission: Transmission;
  groupName: string | null;
  daysLeft: number | null;
  age: number | null;
  assignments: {
    phase: 1 | 2;
    booked: number;
    requiredLessons: number;
    instructorName: string;
    carLabel: string | null;
  }[];
}

export function OperatorStudentsClient({ students }: { students: OperatorStudentRow[] }) {
  const { d, fmt } = useI18n();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) => s.name.toLowerCase().includes(q) || (s.groupName ?? "").toLowerCase().includes(q)
    );
  }, [students, query]);

  if (students.length === 0) {
    return (
      <div className="card text-center py-10">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-3">
          <Icon name="users" size={24} />
        </span>
        <p className="text-sm text-slate-500">{d.operators.empty}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Bară de căutare */}
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

      {filtered.length === 0 ? (
        <p className="card text-sm text-slate-500">{d.common.noData}</p>
      ) : (
        <ul className="space-y-2.5">
          {filtered.map((s) => (
            <StudentCard key={s.id} s={s} d={d} fmt={fmt} />
          ))}
        </ul>
      )}
    </div>
  );
}

function daysBadge(daysLeft: number | null, d: any, fmt: any): { text: string; cls: string } | null {
  if (daysLeft == null) return null;
  if (daysLeft < 0) return { text: d.filters.expired, cls: "bg-rose-50 text-rose-700" };
  let cls = "bg-emerald-50 text-emerald-700";
  if (daysLeft <= 3) cls = "bg-rose-50 text-rose-700";
  else if (daysLeft <= 10) cls = "bg-amber-50 text-amber-700";
  return { text: fmt(d.filters.daysLeft, { n: daysLeft }), cls };
}

function StudentCard({ s, d, fmt }: { s: OperatorStudentRow; d: any; fmt: any }) {
  const badge = daysBadge(s.daysLeft, d, fmt);
  const tx = s.transmission === "manual" ? d.students.manual : d.students.automatic;

  return (
    <li className="card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-slate-900 truncate">{s.name}</h2>
          <p className="text-sm text-slate-500 truncate">
            {tx}
            {s.groupName ? " · " + s.groupName : ""}
            {s.age != null ? " · " + s.age + " " + d.filters.years : ""}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {badge && (
            <span className={"rounded-md px-2 py-0.5 text-xs font-semibold " + badge.cls}>
              {badge.text}
            </span>
          )}
          <Link href={"/operator/students/" + s.id} className="btn-ghost h-9 px-2 text-xs">
            {d.common.open}
          </Link>
        </div>
      </div>

      {/* Faze — compact */}
      <div className="mt-2.5 flex flex-wrap gap-2">
        {s.assignments.length === 0 ? (
          <p className="text-sm text-slate-400">{d.common.noData}</p>
        ) : (
          s.assignments.map((a) => (
            <span
              key={a.phase}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-100 bg-slate-50 px-2 py-1 text-xs"
            >
              <span className="font-semibold text-slate-600">
                {a.phase === 1 ? d.students.phase1 : d.students.phase2}
              </span>
              <span className="tabular-nums font-semibold text-slate-800">
                {a.booked}/{a.requiredLessons}
              </span>
              <span className="text-slate-500 truncate max-w-[10rem]">· {a.instructorName}</span>
            </span>
          ))
        )}
      </div>

      <Link href={"/operator/schedule/" + s.id} className="btn-primary w-full mt-3">
        <Icon name="plus" size={16} /> {d.nav.schedule}
      </Link>
    </li>
  );
}
