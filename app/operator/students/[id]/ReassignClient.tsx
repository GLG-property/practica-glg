"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/provider";
import { Icon } from "@/components/icons";
import { reassignInstructorOperatorAction } from "@/app/operator/actions";

export type InstructorOpt = { id: string; name: string };
export type PhaseAssign = { phase: 1 | 2; instructorId: string };

/** Operatorul poate muta cursantul pe alt instructor (concediu / schimb). */
export function ReassignClient({
  studentId,
  assignments,
  instructors,
}: {
  studentId: string;
  assignments: PhaseAssign[];
  instructors: InstructorOpt[];
}) {
  const { d } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [savedPhase, setSavedPhase] = useState<number | null>(null);
  const [error, setError] = useState(false);

  function change(phase: 1 | 2, instructorId: string) {
    if (!instructorId) return;
    setError(false);
    setSavedPhase(null);
    startTransition(async () => {
      const res = await reassignInstructorOperatorAction({ studentId, phase, instructorId });
      if (res.ok) {
        setSavedPhase(phase);
        router.refresh();
      } else {
        setError(true);
      }
    });
  }

  if (assignments.length === 0) return null;

  return (
    <div className="card space-y-3">
      <h3 className="section-title flex items-center gap-1.5">
        <Icon name="users" size={16} /> {d.operators.changeInstructor}
      </h3>
      {assignments.map((a) => (
        <div key={a.phase}>
          <label className="label">{a.phase === 1 ? d.students.phase1 : d.students.phase2}</label>
          <select
            className="input"
            value={a.instructorId}
            disabled={pending}
            onChange={(e) => change(a.phase, e.target.value)}
          >
            {!instructors.some((i) => i.id === a.instructorId) && (
              <option value={a.instructorId}>—</option>
            )}
            {instructors.map((i) => (
              <option key={i.id} value={i.id}>{i.name}</option>
            ))}
          </select>
        </div>
      ))}
      {savedPhase != null && <p className="text-sm font-semibold text-status-completed">{d.operators.reassigned}</p>}
      {error && <p className="text-sm font-semibold text-status-noshow">{d.common.error}</p>}
    </div>
  );
}
