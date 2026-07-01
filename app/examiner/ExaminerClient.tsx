"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/provider";
import { Icon } from "@/components/icons";
import { dateTime } from "@/lib/utils/date";
import type { ExamResult } from "@/lib/db/types";
import { setExamResultAction } from "./actions";

export type ExaminerExam = {
  id: string;
  studentName: string;
  scheduled_at: string;
  result: ExamResult;
  mention: string | null;
};

export function ExaminerClient({ exams }: { exams: ExaminerExam[] }) {
  const { d } = useI18n();
  if (exams.length === 0) {
    return <div className="card text-center text-sm text-slate-500">{d.exam.empty}</div>;
  }
  return (
    <ul className="space-y-3">
      {exams.map((e) => (
        <ExamCard key={e.id} e={e} />
      ))}
    </ul>
  );
}

function ExamCard({ e }: { e: ExaminerExam }) {
  const { d } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [mention, setMention] = useState(e.mention ?? "");
  const [error, setError] = useState(false);

  function setResult(result: ExamResult) {
    setError(false);
    startTransition(async () => {
      const res = await setExamResultAction({ examId: e.id, result, mention: mention.trim() || null });
      if (res.ok) router.refresh();
      else setError(true);
    });
  }

  const isAdmis = e.result === "admis";
  const isRespins = e.result === "respins";

  return (
    <li className="card space-y-3">
      <div>
        <p className="text-lg font-semibold text-slate-900">{e.studentName}</p>
        <p className="text-sm text-slate-500">{dateTime(e.scheduled_at)}</p>
      </div>

      {/* Mențiuni */}
      <div>
        <label className="label">{d.exam.mention}</label>
        <textarea
          className="input min-h-[64px]"
          value={mention}
          onChange={(ev) => setMention(ev.target.value)}
          placeholder={d.exam.mentionPlaceholder}
        />
      </div>

      {/* Admis / Respins — live */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => setResult("admis")}
          className={
            "flex items-center justify-center gap-2 rounded-xl py-3 font-semibold transition " +
            (isAdmis ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100")
          }
        >
          <Icon name="check" size={20} /> {d.exam.markAdmis}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => setResult("respins")}
          className={
            "flex items-center justify-center gap-2 rounded-xl py-3 font-semibold transition " +
            (isRespins ? "bg-rose-600 text-white" : "bg-rose-50 text-rose-700 hover:bg-rose-100")
          }
        >
          <Icon name="x" size={20} /> {d.exam.markRespins}
        </button>
      </div>

      {(isAdmis || isRespins) && (
        <button
          type="button"
          disabled={pending}
          onClick={() => setResult("pending")}
          className="text-xs font-medium text-slate-400 hover:text-slate-600"
        >
          {d.exam.pending}
        </button>
      )}

      {error && <p className="text-sm font-medium text-status-noshow">{d.common.error}</p>}
    </li>
  );
}
