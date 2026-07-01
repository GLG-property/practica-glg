"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/provider";
import { Icon } from "@/components/icons";
import type { LangPref } from "@/lib/db/types";
import {
  createInstructorAction,
  updateInstructorAction,
  removeInstructorKeepCarAction,
} from "@/app/admin/actions/instructors";

export interface InstructorRow {
  id: string;
  full_name: string;
  phone: string | null;
  language_pref: LangPref;
  assigned_car_id: string | null;
  operator_id: string | null;
  active: boolean;
  work_start: string;
  work_end: string;
}

export interface CarRow {
  id: string;
  model: string;
  plate: string;
}

export interface OperatorRow {
  id: string;
  name: string;
}

function carLabel(car: CarRow): string {
  return car.plate ? car.model + " · " + car.plate : car.model;
}

export function InstructorsClient({
  instructors,
  cars,
  operators,
}: {
  instructors: InstructorRow[];
  cars: CarRow[];
  operators: OperatorRow[];
}) {
  const { d } = useI18n();
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const carById = new Map(cars.map((c) => [c.id, c]));
  const opById = new Map(operators.map((o) => [o.id, o.name]));

  async function onRemove(inst: InstructorRow) {
    if (!confirm(`Ștergi instructorul ${inst.full_name}? (mașina rămâne în flotă)`)) return;
    const res = await removeInstructorKeepCarAction(inst.id);
    if (res.ok) router.refresh();
  }

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
          operators={operators}
          onClose={() => setAdding(false)}
        />
      )}

      {instructors.length === 0 && !adding ? (
        <p className="xwrap px-3 py-6 text-center text-sm text-slate-400">{d.common.noData}</p>
      ) : (
        <div className="xwrap">
          <table className="xtable">
            <thead>
              <tr>
                <th>{d.students.lastName}</th>
                <th>{d.students.phone}</th>
                <th>{d.instructors.car}</th>
                <th>{d.roles.operator}</th>
                <th className="td-num">Program</th>
                <th>{d.groups.status}</th>
                <th>Acțiuni</th>
              </tr>
            </thead>
            <tbody>
              {instructors.map((inst) => {
                const car = inst.assigned_car_id
                  ? carById.get(inst.assigned_car_id)
                  : null;
                const isEditing = editingId === inst.id;

                if (isEditing) {
                  return (
                    <tr key={inst.id}>
                      <td colSpan={7} className="p-2">
                        <InstructorForm
                          mode="edit"
                          cars={cars}
                          operators={operators}
                          initial={inst}
                          onClose={() => setEditingId(null)}
                        />
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={inst.id} className={inst.active ? "" : "opacity-60"}>
                    <td className="font-semibold text-slate-900">
                      {inst.full_name}
                    </td>
                    <td>
                      {inst.phone || <span className="text-slate-300">—</span>}
                    </td>
                    <td>
                      {car ? (
                        carLabel(car)
                      ) : (
                        <span className="text-slate-300">{d.common.none}</span>
                      )}
                    </td>
                    <td>
                      {inst.operator_id && opById.get(inst.operator_id) ? (
                        opById.get(inst.operator_id)
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="td-num">
                      {inst.work_start.slice(0, 5)}–{inst.work_end.slice(0, 5)}
                    </td>
                    <td>
                      {inst.active ? (
                        <span className="cell-badge bg-emerald-50 text-emerald-700">
                          {d.cars.active}
                        </span>
                      ) : (
                        <span className="cell-badge bg-slate-200 text-slate-600">
                          inactiv
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          className="btn-ghost px-2"
                          onClick={() => {
                            setAdding(false);
                            setEditingId(inst.id);
                          }}
                          aria-label={d.common.edit}
                        >
                          <Icon name="edit" size={16} />
                        </button>
                        {inst.active && (
                          <button
                            type="button"
                            className="btn-ghost px-2 text-status-noshow"
                            onClick={() => onRemove(inst)}
                            aria-label={d.common.delete}
                            title="Șterge instructor (mașina rămâne)"
                          >
                            <Icon name="x" size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function InstructorForm({
  mode,
  cars,
  operators,
  initial,
  onClose,
}: {
  mode: "create" | "edit";
  cars: CarRow[];
  operators: OperatorRow[];
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
  const [operatorId, setOperatorId] = useState(initial?.operator_id ?? "");
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
      fd.set("operator_id", operatorId);
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
        operator_id: operatorId || null,
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
        <label className="label" htmlFor="operator_id">{d.roles.operator}</label>
        <select
          id="operator_id"
          name="operator_id"
          className="input"
          value={operatorId}
          onChange={(e) => setOperatorId(e.target.value)}
        >
          <option value="">{d.common.none}</option>
          {operators.map((o) => (
            <option key={o.id} value={o.id}>{o.name}</option>
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
