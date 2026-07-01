"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
                <th>Faze</th>
                <th>{d.filters.daysLeftSort}</th>
                <th>{d.nav.schedule}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <StudentRow key={s.id} s={s} d={d} fmt={fmt} />
              ))}
            </tbody>
          </table>
        </div>
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

function StudentRow({ s, d, fmt }: { s: OperatorStudentRow; d: any; fmt: any }) {
  const router = useRouter();
  const badge = daysBadge(s.daysLeft, d, fmt);
  const tx = s.transmission === "manual" ? d.students.manual : d.students.automatic;

  return (
    <tr className="row-link" onClick={() => router.push("/operator/students/" + s.id)}>
      <td className="font-semibold text-slate-900">{s.name}</td>
      <td>{tx}</td>
      <td>{s.groupName ?? "—"}</td>
      <td className="td-num">{s.age ?? "—"}</td>
      <td>
        {s.assignments.length === 0 ? (
          <span className="text-slate-300">—</span>
        ) : (
          <span className="flex flex-wrap gap-1">
            {s.assignments.map((a) => (
              <span key={a.phase} className="cell-badge bg-slate-100 text-slate-600 tabular-nums">
                F{a.phase} {a.booked}/{a.requiredLessons}
              </span>
            ))}
          </span>
        )}
      </td>
      <td>
        {badge ? (
          <span className={"cell-badge " + badge.cls}>{badge.text}</span>
        ) : (
          <span className="text-slate-300">—</span>
        )}
      </td>
      <td>
        <Link
          href={"/operator/schedule/" + s.id}
          className="btn-ghost h-8 px-2 text-xs"
          onClick={(e) => e.stopPropagation()}
        >
          <Icon name="plus" size={14} /> {d.nav.schedule}
        </Link>
      </td>
    </tr>
  );
}
