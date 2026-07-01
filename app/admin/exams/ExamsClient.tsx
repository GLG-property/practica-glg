"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/provider";
import { Icon } from "@/components/icons";
import { dateTime } from "@/lib/utils/date";
import type { ExamResult } from "@/lib/db/types";
import { createExamAction, deleteExamAction } from "@/app/admin/actions/exams";

export type StudentOpt = { id: string; name: string };
export type ExaminerOpt = { id: string; name: string };
export type ExamLite = {
  id: string;
  studentName: string;
  examinerName: string | null;
  scheduled_at: string;
  result: ExamResult;
  mention: string | null;
};

export function resultBadge(result: ExamResult, d: any): { text: string; cls: string } {
  if (result === "admis") return { text: d.exam.admis, cls: "bg-emerald-50 text-emerald-700" };
  if (result === "respins") return { text: d.exam.respins, cls: "bg-rose-50 text-rose-700" };
  return { text: d.exam.pending, cls: "bg-amber-50 text-amber-700" };
}

export function ExamsClient({
  students,
  examiners,
  exams,
}: {
  students: StudentOpt[];
  examiners: ExaminerOpt[];
  exams: ExamLite[];
}) {
  const { d } = useI18n();
  const [adding, setAdding] = useState(false);

  const { upcoming, done } = useMemo(() => {
    const up: ExamLite[] = [];
    const dn: ExamLite[] = [];
    for (const e of exams) (e.result === "pending" ? up : dn).push(e);
    // viitoarele cronologic crescător
    up.sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
    return { upcoming: up, done: dn };
  }, [exams]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="page-title">{d.exam.title}</h1>
        <button type="button" className="btn-primary" onClick={() => setAdding((v) => !v)}>
          <Icon name={adding ? "x" : "plus"} size={18} />
          {adding ? d.common.cancel : d.exam.addNew}
        </button>
      </div>

      {adding && <ExamForm students={students} examiners={examiners} onDone={() => setAdding(false)} />}

      {exams.length === 0 && !adding ? (
        <div className="card text-center text-sm text-slate-500">{d.exam.empty}</div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <section className="space-y-2">
              <h2 className="section-title">{d.exam.upcoming}</h2>
              <ul className="space-y-2.5">
                {upcoming.map((e) => (
                  <ExamRow key={e.id} e={e} canDelete />
                ))}
              </ul>
            </section>
          )}
          {done.length > 0 && (
            <section className="space-y-2">
              <h2 className="section-title">{d.exam.done}</h2>
              <ul className="space-y-2.5">
                {done.map((e) => (
                  <ExamRow key={e.id} e={e} />
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function ExamRow({ e, canDelete = false }: { e: ExamLite; canDelete?: boolean }) {
  const { d } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const badge = resultBadge(e.result, d);

  function onDelete() {
    if (!confirm(d.exam.deleteConfirm)) return;
    startTransition(async () => {
      const res = await deleteExamAction(e.id);
      if (res.ok) router.refresh();
    });
  }

  return (
    <li className="card space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-slate-900 truncate">{e.studentName}</p>
          <p className="text-sm text-slate-500">{dateTime(e.scheduled_at)}</p>
          <p className="text-xs text-slate-400">
            {d.exam.examiner}: {e.examinerName ?? d.exam.noExaminer}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className={"rounded-md px-2 py-0.5 text-xs font-semibold " + badge.cls}>{badge.text}</span>
          {canDelete && (
            <button type="button" className="btn-ghost px-2" onClick={onDelete} disabled={pending} aria-label={d.common.delete}>
              <Icon name="x" size={18} />
            </button>
          )}
        </div>
      </div>
      {e.mention && (
        <p className="rounded-lg bg-slate-50 px-2.5 py-1.5 text-sm text-slate-600">
          <span className="font-medium text-slate-500">{d.exam.mention}: </span>
          {e.mention}
        </p>
      )}
    </li>
  );
}

function ExamForm({
  students,
  examiners,
  onDone,
}: {
  students: StudentOpt[];
  examiners: ExaminerOpt[];
  onDone: () => void;
}) {
  const { d } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [studentId, setStudentId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");
  const [examinerId, setExaminerId] = useState("");

  function submit() {
    setError(null);
    if (!studentId || !date || !time) {
      setError(d.common.error);
      return;
    }
    startTransition(async () => {
      const fd = new FormData();
      fd.set("student_id", studentId);
      fd.set("date", date);
      fd.set("time", time);
      fd.set("examiner_id", examinerId);
      const res = await createExamAction(fd);
      if (res.ok) {
        router.refresh();
        onDone();
      } else {
        setError(d.common.error);
      }
    });
  }

  return (
    <div className="card space-y-3">
      <p className="section-title">{d.exam.addNew}</p>

      <div>
        <label className="label">{d.exam.student}</label>
        <select className="input" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
          <option value="">{d.common.select}</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">{d.filters.from}</label>
          <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <label className="label">{d.exam.scheduledAt}</label>
          <input type="time" className="input" value={time} onChange={(e) => setTime(e.target.value)} step={300} />
        </div>
      </div>

      <div>
        <label className="label">{d.exam.examiner}</label>
        <select className="input" value={examinerId} onChange={(e) => setExaminerId(e.target.value)}>
          <option value="">{d.exam.noExaminer}</option>
          {examiners.map((x) => (
            <option key={x.id} value={x.id}>{x.name}</option>
          ))}
        </select>
      </div>

      {error && <p className="text-sm font-medium text-status-noshow">{error}</p>}

      <div className="flex items-center gap-2 pt-1">
        <button type="button" className="btn-primary" onClick={submit} disabled={pending}>
          <Icon name="check" size={18} />
          {pending ? d.common.loading : d.common.save}
        </button>
        <button type="button" className="btn-secondary" onClick={onDone} disabled={pending}>
          {d.common.cancel}
        </button>
      </div>
    </div>
  );
}
