"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/provider";
import { Icon } from "@/components/icons";
import { toggleAbsenceAction } from "@/app/theory/actions";

type AttStudent = { id: string; name: string; absent: boolean; absencesTotal: number };

export function AttendanceClient({
  groupId,
  date,
  students,
}: {
  groupId: string;
  date: string;
  students: AttStudent[];
}) {
  const { d } = useI18n();
  const router = useRouter();

  // Schimbarea datei reîncarcă pagina cu ?date=
  function onDate(newDate: string) {
    if (!newDate) return;
    router.push("/theory/group/" + groupId + "?date=" + newDate);
  }

  return (
    <div className="space-y-3">
      <div className="card">
        <label className="label flex items-center gap-1.5">
          <Icon name="calendar" size={16} /> {d.theory.pickDate}
        </label>
        <input type="date" className="input" value={date} onChange={(e) => onDate(e.target.value)} />
      </div>

      <h2 className="section-title">{d.theory.attendance}</h2>

      {students.length === 0 ? (
        <p className="xwrap px-3 py-6 text-center text-sm text-slate-400">{d.common.noData}</p>
      ) : (
        <div className="xwrap">
          <table className="xtable">
            <thead>
              <tr>
                <th>{d.students.lastName}</th>
                <th className="td-num">Absențe total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <StudentToggle key={s.id} s={s} groupId={groupId} date={date} d={d} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StudentToggle({
  s,
  groupId,
  date,
  d,
}: {
  s: AttStudent;
  groupId: string;
  date: string;
  d: any;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [absent, setAbsent] = useState(s.absent);

  function toggle() {
    const next = !absent;
    setAbsent(next); // optimist
    startTransition(async () => {
      const res = await toggleAbsenceAction({ studentId: s.id, groupId, date, absent: next });
      if (res.ok) router.refresh();
      else setAbsent(!next); // revenire la eroare
    });
  }

  return (
    <tr>
      <td className="font-semibold text-slate-900">{s.name}</td>
      <td className="td-num">{s.absencesTotal}</td>
      <td>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggle();
          }}
          disabled={pending}
          className={
            "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-sm font-semibold transition " +
            (absent ? "bg-rose-600 text-white" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100")
          }
        >
          <Icon name={absent ? "absent" : "check"} size={16} />
          {absent ? d.theory.absent : d.theory.present}
        </button>
      </td>
    </tr>
  );
}
