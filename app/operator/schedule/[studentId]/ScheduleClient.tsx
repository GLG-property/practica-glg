"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/provider";
import { Icon } from "@/components/icons";
import { StatusBadge } from "@/components/StatusBadge";
import {
  timeHM,
  monthGrid,
  monthName,
  weekdayShorts,
  isSameMonth,
  isSameDay,
  addMonths,
} from "@/lib/utils/date";
import type { LessonStatus } from "@/lib/db/types";
import {
  createLessonOperatorAction,
  getInstructorDayAction,
  getInstructorMonthAction,
  type DayLessonLite,
} from "@/app/operator/actions";

export interface ScheduleAssignment {
  id: string;
  phase: 1 | 2;
  booked: number; // lecții programate (scheduled + completed)
  completed: number; // lecții efectuate
  requiredLessons: number;
  instructorId: string;
  instructorName: string;
  carLabel: string | null;
  workStart: string; // "HH:MM"
  workEnd: string;
}

const PHASE1_REQUIRED = 12;
const PHASE2_MIN_COMPLETED = 8;

const LESSON_HOURS = 1.5; // toate lecțiile sunt de 1.5h
const SLOT_MIN = 90;

// Sloturi FIXE ca pe orar: 06:00–07:30 … 18:00–19:30 (9 sloturi).
const FIXED_SLOTS: string[] = (() => {
  const out: string[] = [];
  for (let m = 6 * 60; m + SLOT_MIN <= 19 * 60 + 30; m += SLOT_MIN) {
    out.push(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
  }
  return out;
})();

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const ddmmyyyy = (s: string) => {
  const [y, m, dd] = s.split("-");
  return `${dd}.${m}.${y}`;
};
const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

export function ScheduleClient({
  assignments,
  defaultDate,
  phase2Unlocked = false,
}: {
  assignments: ScheduleAssignment[];
  studentLabel: string;
  defaultDate: string;
  phase2Unlocked?: boolean;
}) {
  const { d, fmt, lang } = useI18n();
  const router = useRouter();

  const phase1 = assignments.find((a) => a.phase === 1) ?? null;
  const phase2 = assignments.find((a) => a.phase === 2) ?? null;
  const [phase, setPhase] = useState<1 | 2>(phase1 ? 1 : 2);
  const current = phase === 1 ? phase1 : phase2;
  const instructorId = current?.instructorId;

  // Sloturile din programul instructorului (subset al grilei fixe).
  const slots = useMemo(() => {
    if (!current) return [];
    const ws = toMin(current.workStart);
    const we = toMin(current.workEnd);
    return FIXED_SLOTS.filter((s) => toMin(s) >= ws && toMin(s) + SLOT_MIN <= we);
  }, [current]);
  const capacity = slots.length;

  // Reguli de fază: faza 2 se deblochează după 12 programate + 8 efectuate în faza 1,
  // SAU dacă adminul a deblocat manual faza 2 (ex. cursant care face doar Scala).
  const phase2Ready =
    phase2Unlocked ||
    (!!phase1 && phase1.booked >= PHASE1_REQUIRED && phase1.completed >= PHASE2_MIN_COMPLETED);
  const phaseLocked = current?.phase === 2 && !phase2Ready;
  const phaseFull = !!current && current.booked >= current.requiredLessons;
  const canSchedule = !!current && !phaseLocked && !phaseFull;

  const [date, setDate] = useState(defaultDate);
  const [monthBase, setMonthBase] = useState(() => new Date(defaultDate + "T12:00:00"));
  const [monthLoads, setMonthLoads] = useState<Record<string, number>>({});
  const [startTime, setStartTime] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [dayLessons, setDayLessons] = useState<DayLessonLite[]>([]);
  const [loadingDay, setLoadingDay] = useState(false);

  const today = new Date();
  const todayYmd = ymd(today);
  const nowMin = today.getHours() * 60 + today.getMinutes();

  useEffect(() => {
    if (!instructorId) return setMonthLoads({});
    let cancelled = false;
    const first = ymd(new Date(monthBase.getFullYear(), monthBase.getMonth(), 1));
    getInstructorMonthAction(instructorId, first).then((rows) => {
      if (cancelled) return;
      const rec: Record<string, number> = {};
      for (const r of rows) rec[r.date] = r.count;
      setMonthLoads(rec);
    });
    return () => {
      cancelled = true;
    };
  }, [instructorId, monthBase]);

  useEffect(() => {
    if (!instructorId || !date) return setDayLessons([]);
    let cancelled = false;
    setLoadingDay(true);
    setStartTime(null);
    getInstructorDayAction(instructorId, date)
      .then((rows) => !cancelled && setDayLessons(rows))
      .finally(() => !cancelled && setLoadingDay(false));
    return () => {
      cancelled = true;
    };
  }, [instructorId, date]);

  // Lecția care ocupă un slot (dacă există).
  function lessonInSlot(slot: string): DayLessonLite | null {
    const s = toMin(slot);
    const e = s + SLOT_MIN;
    return (
      dayLessons.find((l) => {
        if (l.status === "cancelled") return false;
        return s < toMin(timeHM(l.end_time)) && toMin(timeHM(l.start_time)) < e;
      }) ?? null
    );
  }
  const slotPast = (slot: string) => date === todayYmd && toMin(slot) + SLOT_MIN <= nowMin;

  async function save() {
    if (!current || !startTime || saving) return;
    setSaving(true);
    setMsg(null);
    const res = await createLessonOperatorAction({
      assignmentId: current.id,
      date,
      startTime,
      durationHours: LESSON_HOURS,
    });
    setSaving(false);
    if (res.ok) {
      setMsg({ ok: true, text: d.lesson.created });
      setStartTime(null);
      const [rows, mrows] = await Promise.all([
        getInstructorDayAction(current.instructorId, date),
        getInstructorMonthAction(current.instructorId, ymd(new Date(monthBase.getFullYear(), monthBase.getMonth(), 1))),
      ]);
      setDayLessons(rows);
      const rec: Record<string, number> = {};
      for (const r of mrows) rec[r.date] = r.count;
      setMonthLoads(rec);
      router.refresh();
    } else if (res.reason === "phase2_locked") {
      setMsg({
        ok: false,
        text: fmt(d.lesson.phase2Locked, {
          booked: res.bookedPhase1 ?? 0,
          done: res.completedPhase1 ?? 0,
        }),
      });
    } else if (res.reason === "phase_full") {
      setMsg({ ok: false, text: fmt(d.lesson.phaseFull, { required: current.requiredLessons }) });
    } else if (res.reason === "conflict_instructor") {
      setMsg({ ok: false, text: d.lesson.conflictInstructor });
    } else if (res.reason === "conflict_car") {
      setMsg({ ok: false, text: d.lesson.conflictCar });
    } else {
      setMsg({ ok: false, text: d.common.error });
    }
  }

  function phaseButton(p: 1 | 2, a: ScheduleAssignment | null) {
    const active = phase === p;
    return (
      <button
        type="button"
        key={p}
        disabled={!a}
        onClick={() => {
          setPhase(p);
          setMsg(null);
          setStartTime(null);
        }}
        className={[
          "flex-1 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors",
          !a
            ? "border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed"
            : active
            ? "border-brand bg-brand text-white"
            : "border-slate-200 bg-white text-slate-700 hover:border-brand/40",
        ].join(" ")}
      >
        {p === 1 ? d.students.phase1 : d.students.phase2}
        {p === 2 && !phase2Ready ? " 🔒" : ""}
        {a && (
          <span className={`block text-xs font-medium ${active ? "text-white/80" : "text-slate-400"}`}>
            {a.booked}/{a.requiredLessons}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="space-y-4">
      {/* Fază + instructor */}
      <div className="card space-y-3">
        <div>
          <span className="label">{d.lesson.phase}</span>
          <div className="flex gap-2">
            {phaseButton(1, phase1)}
            {phaseButton(2, phase2)}
          </div>
        </div>
        {current && (
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
              <Icon name="users" size={15} /> {current.instructorName}
            </p>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500">
              {current.carLabel && (
                <span className="inline-flex items-center gap-1">
                  <Icon name="car" size={13} /> {current.carLabel}
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <Icon name="clock" size={13} /> {current.workStart}–{current.workEnd}
              </span>
            </p>
          </div>
        )}
      </div>

      {/* Faza 2 blocată */}
      {current && phaseLocked && (
        <div className="card border-amber-200 bg-amber-50/60">
          <p className="flex items-center gap-2 text-sm font-bold text-amber-800">🔒 {d.students.phase2}</p>
          <p className="mt-1 text-sm text-amber-700">
            {fmt(d.lesson.phase2Locked, { booked: phase1?.booked ?? 0, done: phase1?.completed ?? 0 })}
          </p>
        </div>
      )}

      {/* Faza completă */}
      {current && !phaseLocked && phaseFull && (
        <div className="card border-emerald-200 bg-emerald-50/60">
          <p className="flex items-center gap-2 text-sm font-bold text-emerald-800">
            <Icon name="check" size={16} /> {fmt(d.lesson.phaseFull, { required: current.requiredLessons })}
          </p>
        </div>
      )}

      {/* Calendar lună: zile libere/ocupate */}
      {canSchedule && (
        <div className="card">
          <div className="mb-2 flex items-center justify-between">
            <span className="label mb-0">{d.lesson.date}</span>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => setMonthBase((m) => addMonths(m, -1))} className="btn-ghost h-8 w-8 p-0">
                <Icon name="back" size={16} />
              </button>
              <span className="min-w-[110px] text-center text-sm font-semibold capitalize text-slate-700">
                {monthName(monthBase, lang)} {monthBase.getFullYear()}
              </span>
              <button type="button" onClick={() => setMonthBase((m) => addMonths(m, 1))} className="btn-ghost h-8 w-8 p-0">
                <Icon name="next" size={16} />
              </button>
            </div>
          </div>

          <div className="mb-1 grid grid-cols-7 gap-1">
            {weekdayShorts(lang).map((w) => (
              <div key={w} className="py-1 text-center text-[11px] font-semibold text-slate-400">
                {w}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {monthGrid(monthBase).map((day) => {
              const key = ymd(day);
              const inMonth = isSameMonth(day, monthBase);
              const isPast = key < todayYmd;
              const isToday = isSameDay(day, today);
              const selected = key === date;
              const count = monthLoads[key] ?? 0;
              const free = capacity - count;
              const disabled = !inMonth || isPast;

              let tone = "text-slate-300";
              if (!disabled) {
                if (count === 0) tone = "bg-emerald-50 text-emerald-700 hover:bg-emerald-100";
                else if (free > 0) tone = "bg-amber-50 text-amber-700 hover:bg-amber-100";
                else tone = "bg-slate-100 text-slate-400";
              }
              if (selected) tone = "bg-brand text-white";

              return (
                <button
                  type="button"
                  key={key}
                  disabled={disabled}
                  onClick={() => setDate(key)}
                  className={`relative flex aspect-square flex-col items-center justify-center rounded-lg text-sm font-semibold transition-colors ${tone} ${
                    isToday && !selected ? "ring-1 ring-brand" : ""
                  } ${disabled ? "cursor-not-allowed" : ""}`}
                >
                  <span>{day.getDate()}</span>
                  {!disabled && capacity > 0 && (
                    <span className={`text-[9px] font-medium leading-none ${selected ? "text-white/80" : "opacity-70"}`}>
                      {free > 0 ? `${free} lib.` : "plin"}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded bg-emerald-100" /> liber</span>
            <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded bg-amber-100" /> parțial</span>
            <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded bg-slate-200" /> plin</span>
          </div>
        </div>
      )}

      {/* Orar: sloturi fixe de 1.5h pentru ziua aleasă */}
      {canSchedule && (
        <div className="card">
          <div className="mb-3 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                {d.instructors.calendar}
              </p>
              <p className="flex items-center gap-1.5 text-base font-bold text-slate-900">
                <Icon name="users" size={16} /> {current.instructorName}
              </p>
            </div>
            <span className="shrink-0 rounded-lg bg-brand-50 px-2.5 py-1 text-sm font-semibold tabular-nums text-brand">
              {ddmmyyyy(date)}
            </span>
          </div>

          {capacity === 0 ? (
            <p className="text-sm text-status-noshow">Program de lucru invalid pentru instructor.</p>
          ) : loadingDay ? (
            <p className="text-sm text-slate-400">{d.common.loading}</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {slots.map((slot, idx) => {
                const end = `${pad(Math.floor((toMin(slot) + SLOT_MIN) / 60))}:${pad((toMin(slot) + SLOT_MIN) % 60)}`;
                const lesson = lessonInSlot(slot);
                const past = slotPast(slot);
                const selected = startTime === slot;
                const free = !lesson && !past;

                return (
                  <li
                    key={slot}
                    className={`flex items-center gap-2 py-2 ${selected ? "bg-brand/5" : ""}`}
                  >
                    <span className="w-5 shrink-0 text-center text-xs font-semibold text-slate-300">{idx + 1}</span>
                    <span className="w-[96px] shrink-0 text-sm font-semibold tabular-nums text-slate-700">
                      {slot}–{end}
                    </span>
                    {lesson ? (
                      <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
                        <span className="truncate text-sm text-slate-600">{lesson.student}</span>
                        <StatusBadge status={lesson.status as LessonStatus} label={d.status[lesson.status as LessonStatus]} />
                      </span>
                    ) : past ? (
                      <span className="flex-1 text-sm text-slate-300">—</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setStartTime(selected ? null : slot)}
                        className={`flex-1 rounded-lg border px-3 py-1.5 text-left text-sm font-semibold transition-colors ${
                          selected
                            ? "border-brand bg-brand text-white"
                            : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        }`}
                      >
                        {selected ? "✓ ales" : "Liber"}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          <button
            type="button"
            onClick={save}
            disabled={saving || !current || !startTime}
            className="btn-primary mt-3 w-full disabled:opacity-50"
          >
            <Icon name="check" size={16} />{" "}
            {saving ? d.common.loading : startTime ? `${d.common.save} · ${startTime} (1.5h)` : "Alege un slot liber"}
          </button>
          {msg && (
            <p className={`mt-2 text-sm font-semibold ${msg.ok ? "text-status-completed" : "text-status-noshow"}`}>
              {msg.text}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
