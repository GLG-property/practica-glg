"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/provider";
import { Icon } from "@/components/icons";
import type { GroupStatus } from "@/lib/db/types";
import { createGroupAction } from "@/app/admin/actions/groups";

export interface GroupRow {
  id: string;
  name: string;
  status: GroupStatus;
  studentCount: number;
}

function GroupStatusBadge({ status }: { status: GroupStatus }) {
  const { d } = useI18n();
  if (status === "sent") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
        <Icon name="check" size={14} />
        {d.groups.sent}
      </span>
    );
  }
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
      <Icon name="edit" size={14} />
      {d.groups.draft}
    </span>
  );
}

export function GroupsClient({ groups }: { groups: GroupRow[] }) {
  const { d, fmt } = useI18n();
  const [adding, setAdding] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="page-title">{d.groups.title}</h1>
        {!adding && (
          <button type="button" className="btn-primary" onClick={() => setAdding(true)}>
            <Icon name="plus" size={18} />
            {d.groups.addNew}
          </button>
        )}
      </div>

      {adding && <GroupForm onClose={() => setAdding(false)} />}

      {groups.length === 0 && !adding ? (
        <p className="card text-sm text-slate-500">{d.common.noData}</p>
      ) : (
        <ul className="space-y-3">
          {groups.map((g) => (
            <li key={g.id}>
              <Link
                href={"/admin/groups/" + g.id}
                className="card flex items-center justify-between gap-3 transition-colors hover:border-brand-100 hover:bg-brand-50/40"
              >
                <div className="min-w-0">
                  <div className="truncate font-semibold text-slate-900">{g.name}</div>
                  <div className="mt-1 inline-flex items-center gap-1.5 text-sm text-slate-500">
                    <Icon name="users" size={14} />
                    {fmt(d.groups.studentsCount, { n: g.studentCount })}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <GroupStatusBadge status={g.status} />
                  <span className="text-slate-300">
                    <Icon name="next" size={18} />
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function GroupForm({ onClose }: { onClose: () => void }) {
  const { d } = useI18n();
  const router = useRouter();
  const [name, setName] = useState("");
  const [theoryTeacher, setTheoryTeacher] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);

    const fd = new FormData();
    fd.set("name", name);
    fd.set("theory_teacher", theoryTeacher);
    const res = await createGroupAction(fd);

    setBusy(false);
    if (res.ok) {
      router.refresh();
      onClose();
    } else {
      setError(d.common.error);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-3 border-brand-100">
      <h2 className="section-title">{d.groups.addNew}</h2>

      <div>
        <label className="label" htmlFor="name">
          {d.groups.name}
        </label>
        <input
          id="name"
          name="name"
          className="input"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div>
        <label className="label" htmlFor="theory_teacher">
          {d.students.theoryTeacher}
        </label>
        <input
          id="theory_teacher"
          name="theory_teacher"
          className="input"
          value={theoryTeacher}
          onChange={(e) => setTheoryTeacher(e.target.value)}
        />
      </div>

      {error && <p className="text-sm text-status-noshow">{error}</p>}

      <div className="flex items-center gap-2 pt-1">
        <button type="submit" disabled={busy} className="btn-primary">
          {busy ? d.common.loading : d.common.save}
        </button>
        <button type="button" className="btn-secondary" onClick={onClose} disabled={busy}>
          {d.common.cancel}
        </button>
      </div>
    </form>
  );
}
