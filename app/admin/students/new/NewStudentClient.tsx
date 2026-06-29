"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/provider";
import { Icon } from "@/components/icons";
import { createStudentAction } from "@/app/admin/actions/students";
import type { Group } from "@/lib/db/types";

/** Formular pentru adăugarea unui cursant nou. */
export function NewStudentClient({
  groups,
}: {
  groups: (Group & { studentCount: number })[];
}) {
  const { d } = useI18n();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [groupId, setGroupId] = useState("");

  // Profesorul teoretic se moștenește din grupa aleasă.
  const selectedGroup = groups.find((g) => g.id === groupId) ?? null;
  const theoryTeacher = selectedGroup?.theory_teacher ?? "";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(false);
    const fd = new FormData(e.currentTarget);
    const res = await createStudentAction(fd);
    if (res.ok && res.studentId) {
      router.push("/admin/students/" + res.studentId);
      return;
    }
    setBusy(false);
    setError(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/admin/students" className="btn-ghost px-2">
          <Icon name="back" size={20} />
        </Link>
        <h1 className="page-title">{d.students.addNew}</h1>
      </div>

      <form onSubmit={onSubmit} className="card space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="last_name">
              {d.students.lastName}
            </label>
            <input id="last_name" name="last_name" required maxLength={60} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="first_name">
              {d.students.firstName}
            </label>
            <input id="first_name" name="first_name" required maxLength={60} className="input" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="phone">
              {d.students.phone}
            </label>
            <input id="phone" name="phone" type="tel" maxLength={40} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="birth_date">
              Data nașterii
            </label>
            <input id="birth_date" name="birth_date" type="date" className="input" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="transmission">
              {d.students.transmission}
            </label>
            <select id="transmission" name="transmission" defaultValue="manual" className="input">
              <option value="manual">{d.students.manual}</option>
              <option value="automatic">{d.students.automatic}</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="group_id">
              {d.students.group}
            </label>
            <select
              id="group_id"
              name="group_id"
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              className="input"
            >
              <option value="">{d.common.none}</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Profesorul teoretic vine automat din grupă (read-only). */}
        <div>
          <label className="label">{d.students.theoryTeacher}</label>
          <div className="input flex items-center bg-slate-50 text-slate-600">
            {theoryTeacher || (
              <span className="text-slate-400">
                {groupId ? "—" : "Se ia din grupă"}
              </span>
            )}
          </div>
        </div>

        <div>
          <label className="label" htmlFor="notes">
            {d.students.notes}
          </label>
          <textarea id="notes" name="notes" rows={3} maxLength={1000} className="input" />
        </div>

        {error && <p className="text-sm font-medium text-status-noshow">{d.common.error}</p>}

        <div className="flex items-center gap-3">
          <button type="submit" disabled={busy} className="btn-primary">
            {busy ? d.common.loading : d.common.save}
          </button>
          <Link href="/admin/students" className="btn-secondary">
            {d.common.cancel}
          </Link>
        </div>
      </form>
    </div>
  );
}
