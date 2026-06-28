"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/provider";
import { Icon } from "@/components/icons";
import { studentName } from "@/lib/db/types";
import type { CarStage, GroupStatus, Transmission } from "@/lib/db/types";
import { assignInstructorAction, sendToOperatorsAction } from "@/app/admin/actions/groups";

export interface GroupInfo {
  id: string;
  name: string;
  theory_teacher: string | null;
  status: GroupStatus;
}

export interface StudentRow {
  id: string;
  first_name: string;
  last_name: string;
  transmission: Transmission;
  assignments: { phase: 1 | 2; instructor_id: string }[];
}

export interface OperatorOption {
  id: string;
  full_name: string;
}

export interface InstructorOption {
  id: string;
  full_name: string;
  transmission: Transmission;
  stage: CarStage;
  plate: string | null;
  model: string | null;
}

type Method = "balanced" | "manual";

function instructorLabel(i: InstructorOption): string {
  return i.model ? i.full_name + " · " + i.model : i.full_name;
}

function currentInstructor(s: StudentRow, phase: 1 | 2): string {
  return s.assignments.find((a) => a.phase === phase)?.instructor_id ?? "";
}

export function GroupDetailClient({
  group,
  students,
  operators,
  instructors,
}: {
  group: GroupInfo;
  students: StudentRow[];
  operators: OperatorOption[];
  instructors: InstructorOption[];
}) {
  const { d, fmt } = useI18n();
  const router = useRouter();

  const sent = group.status === "sent";
  const locked = sent;

  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  const [method, setMethod] = useState<Method>("balanced");
  const [operatorByStudent, setOperatorByStudent] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sentOk, setSentOk] = useState(false);

  const txLabel = (t: Transmission) => (t === "manual" ? d.students.manual : d.students.automatic);

  const ready = useMemo(
    () =>
      students.length > 0 &&
      students.every(
        (s) =>
          !!currentInstructor(s, 1) && !!currentInstructor(s, 2)
      ),
    [students]
  );

  const manualComplete = useMemo(
    () => students.every((s) => !!operatorByStudent[s.id]),
    [students, operatorByStudent]
  );

  async function onAssign(studentId: string, phase: 1 | 2, instructorId: string) {
    if (!instructorId || locked) return;
    const key = studentId + ":" + phase;
    setPendingKey(key);
    setRowError(null);
    const res = await assignInstructorAction({ studentId, phase, instructorId });
    setPendingKey(null);
    if (res.ok) {
      router.refresh();
    } else {
      setRowError(d.common.error);
    }
  }

  async function onSend() {
    if (sending || locked || !ready) return;
    setSendError(null);
    setSentOk(false);

    if (method === "manual" && !manualComplete) {
      setSendError("Fiecare cursant trebuie să aibă un operator.");
      return;
    }
    if (operators.length === 0) {
      setSendError("Nu există operatori disponibili.");
      return;
    }

    setSending(true);
    const res = await sendToOperatorsAction({
      groupId: group.id,
      method,
      manual: method === "manual" ? operatorByStudent : undefined,
    });
    setSending(false);

    if (res.ok) {
      setSentOk(true);
      router.refresh();
    } else if (res.reason === "not_ready") {
      setSendError(d.groups.notReady);
    } else if (res.reason === "missing_operator") {
      setSendError("Fiecare cursant trebuie să aibă un operator.");
    } else if (res.reason === "no_operators") {
      setSendError("Nu există operatori disponibili.");
    } else {
      setSendError(d.common.error);
    }
  }

  return (
    <div className="space-y-4">
      {/* Antet */}
      <div className="flex items-center gap-3">
        <Link href="/admin/groups" className="btn-ghost shrink-0 px-2">
          <Icon name="back" size={20} />
        </Link>
        <div className="min-w-0">
          <h1 className="page-title truncate">{group.name}</h1>
          {group.theory_teacher && (
            <p className="text-sm text-slate-500">
              {d.students.theoryTeacher}: {group.theory_teacher}
            </p>
          )}
        </div>
      </div>

      {/* Banner „trimisă" */}
      {sent && (
        <div className="card flex items-center gap-2 border-emerald-100 bg-emerald-50 text-sm font-medium text-emerald-700">
          <Icon name="check" size={18} />
          {d.groups.sent}
        </div>
      )}

      {/* Atribuire instructori */}
      <section className="space-y-3">
        <h2 className="section-title">{d.groups.assignInstructors}</h2>

        {students.length === 0 ? (
          <p className="card text-sm text-slate-500">{d.common.noData}</p>
        ) : (
          <ul className="space-y-3">
            {students.map((s) => {
              const phase1 = instructors.filter(
                (i) => i.stage === "beginner" && i.transmission === s.transmission
              );
              const phase2 = instructors.filter(
                (i) => i.stage === "advanced" && i.transmission === s.transmission
              );
              const opVal = operatorByStudent[s.id] ?? "";

              return (
                <li key={s.id} className="card space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-900">{studentName(s)}</span>
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                      {txLabel(s.transmission)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <PhaseSelect
                      label={d.students.phase1}
                      value={currentInstructor(s, 1)}
                      options={phase1}
                      disabled={locked || pendingKey === s.id + ":1"}
                      onChange={(v) => onAssign(s.id, 1, v)}
                    />
                    <PhaseSelect
                      label={d.students.phase2}
                      value={currentInstructor(s, 2)}
                      options={phase2}
                      disabled={locked || pendingKey === s.id + ":2"}
                      onChange={(v) => onAssign(s.id, 2, v)}
                    />
                  </div>

                  {/* Operator manual (doar la metoda „Manual" și grupa nu e trimisă) */}
                  {!locked && method === "manual" && (
                    <div>
                      <label className="label">{d.roles.operator}</label>
                      <select
                        className="input"
                        value={opVal}
                        onChange={(e) =>
                          setOperatorByStudent((prev) => ({ ...prev, [s.id]: e.target.value }))
                        }
                      >
                        <option value="">{d.common.select}</option>
                        {operators.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.full_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {rowError && <p className="text-sm text-status-noshow">{rowError}</p>}
      </section>

      {/* Repartizare + trimitere */}
      {!sent && (
        <section className="card space-y-3">
          <h2 className="section-title">{d.groups.distribute}</h2>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="radio"
                name="method"
                className="h-4 w-4 border-slate-300 text-brand focus:ring-brand/30"
                checked={method === "balanced"}
                onChange={() => setMethod("balanced")}
              />
              {d.groups.balanced}
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="radio"
                name="method"
                className="h-4 w-4 border-slate-300 text-brand focus:ring-brand/30"
                checked={method === "manual"}
                onChange={() => setMethod("manual")}
              />
              {d.groups.manual}
            </label>
          </div>

          {!ready && (
            <p className="flex items-center gap-1.5 text-sm text-amber-600">
              <Icon name="alert" size={16} />
              {d.groups.notReady}
            </p>
          )}

          {sendError && <p className="text-sm text-status-noshow">{sendError}</p>}
          {sentOk && (
            <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
              <Icon name="check" size={16} />
              {d.groups.sentConfirm}
            </p>
          )}

          <button
            type="button"
            className="btn-primary w-full"
            disabled={!ready || sending}
            onClick={onSend}
          >
            <Icon name="next" size={18} />
            {sending ? d.common.loading : d.groups.sendToOperators}
          </button>
        </section>
      )}

      <p className="px-1 text-xs text-slate-400">
        {fmt(d.groups.studentsCount, { n: students.length })}
      </p>
    </div>
  );
}

function PhaseSelect({
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  options: InstructorOption[];
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const { d } = useI18n();
  // Dacă instructorul curent nu mai e în lista filtrată (ex. mașină schimbată),
  // îl adăugăm ca opțiune ascunsă ca să rămână vizibil.
  const hasCurrent = !value || options.some((o) => o.id === value);

  return (
    <div>
      <label className="label">{label}</label>
      <select
        className="input"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{d.common.select}</option>
        {!hasCurrent && <option value={value}>—</option>}
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {instructorLabel(o)}
          </option>
        ))}
      </select>
    </div>
  );
}
