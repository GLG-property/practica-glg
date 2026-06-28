"use client";

import Link from "next/link";
import { useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { Icon } from "@/components/icons";
import { studentName, type Transmission } from "@/lib/db/types";

type Item = {
  id: string;
  first_name: string;
  last_name: string;
  transmission: Transmission;
};

/** Listă cu căutare a cursanților atribuiți instructorului. */
export function StudentSearch({ students }: { students: Item[] }) {
  const { d } = useI18n();
  const [q, setQ] = useState("");

  const term = q.trim().toLowerCase();
  const filtered = term
    ? students.filter((st) => studentName(st).toLowerCase().includes(term))
    : students;

  return (
    <div className="space-y-3">
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
          <Icon name="search" size={18} />
        </span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={d.students.searchPlaceholder}
          className="input pl-10"
          aria-label={d.common.search}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="card text-center text-sm text-slate-400">{d.common.noData}</div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((st) => {
            const initials = `${st.last_name[0] ?? ""}${st.first_name[0] ?? ""}`.toUpperCase();
            return (
              <li key={st.id}>
                <Link
                  href={"/instructor/students/" + st.id}
                  className="card flex items-center gap-3 min-h-tap hover:border-brand/40"
                >
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand">
                    {initials}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-900">
                      {studentName(st)}
                    </span>
                    <span className="block text-xs text-slate-500">
                      {st.transmission === "manual" ? d.students.manual : d.students.automatic}
                    </span>
                  </span>
                  <Icon name="next" size={18} className="shrink-0 text-slate-300" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
