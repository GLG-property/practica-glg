"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/provider";
import { Icon } from "@/components/icons";
import type { LangPref } from "@/lib/db/types";
import {
  createInstructorAction,
  updateInstructorAction,
} from "@/app/admin/actions/instructors";

export interface InstructorRow {
  id: string;
  full_name: string;
  phone: string | null;
  language_pref: LangPref;
  assigned_car_id: string | null;
  active: boolean;
  work_start: string;
  work_end: string;
}

export interface CarRow {
  id: string;
  model: string;
  plate: string;
}

function carLabel(car: CarRow): string {
  return car.plate ? car.model + " · " + car.plate : car.model;
}

export function InstructorsClient({
  instructors,
  cars,
}: {
  instructors: InstructorRow[];
  cars: CarRow[];
}) {
  const { d } = useI18n();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const carById = new Map(cars.map((c) => [c.id, c]));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="page-title">{d.instructors.title}</h1>
        {!adding && (
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              setEditingId(null);
              setAdding(true);
            }}
          >
            <Icon name="plus" size={18} />
            {d.instructors.addNew}
          </button>
        )}
      </div>

      {adding && (
        <InstructorForm
          mode="create"
          cars={cars}
          onClose={() => setAdding(false)}
        />
      )}

      {instructors.length === 0 && !adding ? (
        <p className="card text-sm text-slate-500">{d.common.noData}</p>
      ) : (
        <ul className="space-y-3">
          {instructors.map((inst) => {
            const car = inst.assigned_car_id
              ? carById.get(inst.assigned_car_id)
              : null;
            const isEditing = editingId === inst.id;

            return (
              <li key={inst.id}>
                {isEditing ? (
                  <InstructorForm
                    mode="edit"
                    cars={cars}
                    initial={inst}
                    onClose={() => setEditingId(null)}
                  />
                ) : (
                  <div
                    className={
                      "card flex items-center justify-between gap-3 " +
                      (inst.active ? "" : "opacity-50")
                    }
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 truncate">
                          {inst.full_name}
                        </span>
                        {!inst.active && (
                          <span className="shrink-0 rounded-md bg-slate-200 px-1.5 py-0.5 text-xs font-medium text-slate-600">
                            inactiv
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex flex-col gap-0.5 text-sm text-slate-500">
                        {inst.phone && (
                          <span className="inline-flex items-center gap-1.5">
                            <Icon name="phone" size={14} />
                            {inst.phone}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1.5">
                          <Icon name="car" size={14} />
                          {car ? carLabel(car) : d.common.none}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn-secondary shrink-0"
                      onClick={() => {
                        setAdding(false);
                        setEditingId(inst.id);
                      }}
                    >
                      <Icon name="edit" size={16} />
                      {d.common.edit}
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function InstructorForm({
  mode,
  cars,
  initial,
  onClose,
}: {
  mode: "create" | "edit";
  cars: CarRow[];
  initial?: InstructorRow;
  onClose: () => void;
}) {
  const { d } = useI18n();
  const router = useRouter();

  const [fullName, setFullName] = useState(initial?.full_name ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [language, setLanguage] = useState<LangPref>(
    initial?.language_pref ?? "ro"
  );
  const [carId, setCarId] = useState(initial?.assigned_car_id ?? "");
  const [code, setCode] = useState("");
  const [active, setActive] = useState(initial?.active ?? true);
  const [workStart, setWorkStart] = useState((initial?.work_start ?? "08:00").slice(0, 5));
  const [workEnd, setWorkEnd] = useState((initial?.work_end ?? "18:00").slice(0, 5));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);

    let res: { ok: boolean; error?: string };
    if (mode === "create") {
      const fd = new FormData();
      fd.set("full_name", fullName);
      fd.set("phone", phone);
      fd.set("language_pref", language);
      fd.set("assigned_car_id", carId);
      fd.set("code", code);
      fd.set("work_start", workStart);
      fd.set("work_end", workEnd);
      res = await createInstructorAction(fd);
    } else {
      res = await updateInstructorAction({
        id: initial!.id,
        full_name: fullName,
        phone: phone,
        language_pref: language,
        assigned_car_id: carId || null,
        active,
        code: code || null,
        work_start: workStart,
        work_end: workEnd,
      });
    }

    setBusy(false);
    if (res.ok) {
      router.refresh();
      onClose();
    } else {
      setError(
        res.error === "invalid_code"
          ? "Cod invalid (trebuie 5 cifre)."
          : res.error === "code_taken"
          ? "Acest cod e deja folosit de alt instructor."
          : res.error === "invalid_hours"
          ? "Program de lucru invalid (sfârșitul trebuie după început)."
          : d.common.error
      );
    }
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-3 border-brand-100">
      <h2 className="section-title">
        {mode === "create" ? d.instructors.addNew : d.common.edit}
      </h2>

      <div>
        <label className="label" htmlFor="full_name">
          Nume complet
        </label>
        <input
          id="full_name"
          name="full_name"
          className="input"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
      </div>

      <div>
        <label className="label" htmlFor="phone">
          {d.students.phone}
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          className="input"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>

      <div>
        <label className="label" htmlFor="language_pref">
          {d.lang.switch}
        </label>
        <select
          id="language_pref"
          name="language_pref"
          className="input"
          value={language}
          onChange={(e) => setLanguage(e.target.value as LangPref)}
        >
          <option value="ro">{d.lang.ro}</option>
          <option value="ru">{d.lang.ru}</option>
        </select>
      </div>

      <div>
        <label className="label" htmlFor="assigned_car_id">
          {d.instructors.car}
        </label>
        <select
          id="assigned_car_id"
          name="assigned_car_id"
          className="input"
          value={carId}
          onChange={(e) => setCarId(e.target.value)}
        >
          <option value="">{d.common.none}</option>
          {cars.map((c) => (
            <option key={c.id} value={c.id}>
              {carLabel(c)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label">Program de lucru</label>
        <div className="flex items-center gap-2">
          <input
            type="time"
            step={900}
            className="input"
            value={workStart}
            onChange={(e) => setWorkStart(e.target.value)}
            aria-label="Început program"
          />
          <span className="text-slate-400">–</span>
          <input
            type="time"
            step={900}
            className="input"
            value={workEnd}
            onChange={(e) => setWorkEnd(e.target.value)}
            aria-label="Sfârșit program"
          />
        </div>
        <p className="mt-1 text-xs text-slate-400">Sloturile de programare (1.5h) se generează în acest interval.</p>
      </div>

      <div>
        <label className="label" htmlFor="code">
          {mode === "create"
            ? d.instructors.code
            : "Cod nou (lasă gol pentru a păstra)"}
        </label>
        <input
          id="code"
          name="code"
          inputMode="numeric"
          pattern="\d{5}"
          maxLength={5}
          className="input"
          placeholder="•••••"
          required={mode === "create"}
          value={code}
          onChange={(e) =>
            setCode(e.target.value.replace(/\D/g, "").slice(0, 5))
          }
        />
      </div>

      {mode === "edit" && (
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand/30"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
          />
          {d.cars.active}
        </label>
      )}

      {error && <p className="text-sm text-status-noshow">{error}</p>}

      <div className="flex items-center gap-2 pt-1">
        <button type="submit" disabled={busy} className="btn-primary">
          {busy ? d.common.loading : d.common.save}
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={onClose}
          disabled={busy}
        >
          {d.common.cancel}
        </button>
      </div>
    </form>
  );
}
