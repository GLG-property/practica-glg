"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/provider";
import { Icon } from "@/components/icons";
import { studentName, type Student } from "@/lib/db/types";

/** Lista de cursanți cu căutare după nume (filtrare în client). */
export function StudentsListClient({ students }: { students: Student[] }) {
  const { d } = useI18n();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) => studentName(s).toLowerCase().includes(q));
  }, [students, query]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="page-title">{d.students.title}</h1>
        <Link href="/admin/students/new" className="btn-primary">
          <Icon name="plus" size={18} /> {d.students.addNew}
        </Link>
      </div>

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
        <p className="card text-sm text-slate-400">{d.common.noData}</p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((s) => (
            <li key={s.id}>
              <Link
                href={"/admin/students/" + s.id}
                className="card flex items-center justify-between gap-3 hover:border-brand/40"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-900">
                    {studentName(s)}
                  </p>
                  <p className="text-sm text-slate-500">
                    {s.transmission === "manual"
                      ? d.students.manual
                      : d.students.automatic}
                    {s.phone ? " · " + s.phone : ""}
                  </p>
                </div>
                <span className="shrink-0 text-slate-400">
                  <Icon name="next" size={18} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
