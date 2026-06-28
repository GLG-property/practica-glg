"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Car } from "@/lib/db/types";
import { useI18n } from "@/lib/i18n/provider";
import { Icon } from "@/components/icons";
import { expiryLevel, expiryClasses } from "@/lib/utils/expiry";
import { createCarAction, updateCarAction } from "../actions/cars";

/** Afișează o dată YYYY-MM-DD ca DD.MM.YYYY (sau "—" dacă lipsește). */
function fmtDate(d: string | null): string {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  if (!y || !m || !day) return d;
  return day + "." + m + "." + y;
}

export interface InstructorLite {
  id: string;
  full_name: string;
  assigned_car_id: string | null;
  active: boolean;
}

export function CarsClient({
  cars,
  instructors,
}: {
  cars: Car[];
  instructors: InstructorLite[];
}) {
  const { d } = useI18n();
  const c = d.cars;
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Șoferul (instructorul) atribuit fiecărei mașini.
  const driverByCar = new Map<string, InstructorLite>();
  for (const i of instructors) {
    if (i.assigned_car_id) driverByCar.set(i.assigned_car_id, i);
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="page-title">{c.title}</h1>
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            setEditingId(null);
            setAdding((v) => !v);
          }}
        >
          <Icon name={adding ? "x" : "plus"} size={18} />
          <span>{adding ? d.common.cancel : c.addNew}</span>
        </button>
      </div>

      {adding && (
        <div className="card mb-4">
          <h2 className="section-title mb-3">{c.addNew}</h2>
          <CarForm
            instructors={instructors}
            onDone={() => setAdding(false)}
            onCancel={() => setAdding(false)}
          />
        </div>
      )}

      {cars.length === 0 && !adding ? (
        <p className="card text-slate-500">{d.common.noData}</p>
      ) : (
        <div className="space-y-3">
          {cars.map((car) =>
            editingId === car.id ? (
              <div key={car.id} className="card">
                <h2 className="section-title mb-3">
                  {car.model} · {car.plate}
                </h2>
                <CarForm
                  car={car}
                  instructors={instructors}
                  currentDriverId={driverByCar.get(car.id)?.id ?? ""}
                  onDone={() => setEditingId(null)}
                  onCancel={() => setEditingId(null)}
                />
              </div>
            ) : (
              <CarCard
                key={car.id}
                car={car}
                driver={driverByCar.get(car.id) ?? null}
                onEdit={() => {
                  setAdding(false);
                  setEditingId(car.id);
                }}
              />
            )
          )}
        </div>
      )}
    </div>
  );
}

function CarCard({
  car,
  driver,
  onEdit,
}: {
  car: Car;
  driver: InstructorLite | null;
  onEdit: () => void;
}) {
  const { d } = useI18n();
  const c = d.cars;

  const transmissionLabel =
    car.transmission === "manual" ? d.students.manual : d.students.automatic;
  const stageLabel = car.stage === "beginner" ? c.beginner : c.advanced;

  const badges: { label: string; value: string | null }[] = [
    { label: c.itp, value: car.itp_expiry },
    { label: c.insurance, value: car.insurance_expiry },
    { label: c.service, value: car.service_due },
  ];

  return (
    <div className="card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-brand">
              <Icon name="car" size={20} />
            </span>
            <h3 className="truncate text-lg font-semibold text-slate-900">{car.model}</h3>
            {!car.active && (
              <span className="rounded-full border border-slate-300 bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                {/* eticheta lipsă în dicționar — literal RO */}
                Inactivă
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm font-medium text-slate-600">{car.plate}</p>
          {/* Șoferul (instructorul) atribuit acestei mașini */}
          <p className="mt-1 inline-flex items-center gap-1.5 text-sm">
            <Icon name="users" size={14} className="text-slate-400" />
            {driver ? (
              <span className="font-medium text-slate-700">{driver.full_name}</span>
            ) : (
              <span className="text-slate-400">Fără șofer atribuit</span>
            )}
          </p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <span className={`rounded-full px-2.5 py-1 font-bold ${car.category === "B" ? "bg-brand text-white" : "bg-amber-100 text-amber-700"}`}>
              Cat. {car.category}
            </span>
            <span className="rounded-full bg-brand-50 px-2.5 py-1 font-medium text-brand">
              {c.transmission}: {transmissionLabel}
            </span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700">
              {c.stage}: {stageLabel}
            </span>
          </div>
        </div>
        <button type="button" className="btn-secondary shrink-0" onClick={onEdit}>
          <Icon name="edit" size={18} />
          <span>{d.common.edit}</span>
        </button>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {badges.map((b) => (
          <div
            key={b.label}
            className={
              "flex items-center justify-between rounded-lg border px-3 py-2 text-sm " +
              expiryClasses(expiryLevel(b.value))
            }
          >
            <span className="font-medium">{b.label}</span>
            <span className="tabular-nums">{fmtDate(b.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CarForm({
  car,
  instructors,
  currentDriverId = "",
  onDone,
  onCancel,
}: {
  car?: Car;
  instructors: InstructorLite[];
  currentDriverId?: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const { d } = useI18n();
  const c = d.cars;
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const form = formRef.current;
    if (!form) return;
    const fd = new FormData(form);

    startTransition(async () => {
      if (car) {
        const res = await updateCarAction({
          id: car.id,
          plate: String(fd.get("plate") ?? ""),
          model: String(fd.get("model") ?? ""),
          transmission: String(fd.get("transmission") ?? ""),
          stage: String(fd.get("stage") ?? ""),
          category: String(fd.get("category") ?? "B"),
          instructorId: (String(fd.get("instructor_id") ?? "") || null) as string | null,
          itp_expiry: (fd.get("itp_expiry") as string) || null,
          insurance_expiry: (fd.get("insurance_expiry") as string) || null,
          service_due: (fd.get("service_due") as string) || null,
          notes: (fd.get("notes") as string) || null,
          active: fd.get("active") === "on",
        });
        if (!res.ok) {
          setErr(d.common.error);
          return;
        }
      } else {
        const res = await createCarAction(fd);
        if (!res.ok) {
          setErr(d.common.error);
          return;
        }
      }
      router.refresh();
      onDone();
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-3">
      {/* Notele nu se editează aici — le păstrăm intacte la salvare. */}
      <input type="hidden" name="notes" defaultValue={car?.notes ?? ""} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="plate">
            {c.plate}
          </label>
          <input
            id="plate"
            name="plate"
            className="input"
            defaultValue={car?.plate ?? ""}
            required
            maxLength={20}
          />
        </div>
        <div>
          <label className="label" htmlFor="model">
            {c.model}
          </label>
          <input
            id="model"
            name="model"
            className="input"
            defaultValue={car?.model ?? ""}
            required
            maxLength={60}
          />
        </div>
        <div>
          <label className="label" htmlFor="transmission">
            {c.transmission}
          </label>
          <select
            id="transmission"
            name="transmission"
            className="input"
            defaultValue={car?.transmission ?? "manual"}
          >
            <option value="manual">{d.students.manual}</option>
            <option value="automatic">{d.students.automatic}</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="stage">
            {c.stage}
          </label>
          <select
            id="stage"
            name="stage"
            className="input"
            defaultValue={car?.stage ?? "beginner"}
          >
            <option value="beginner">{c.beginner}</option>
            <option value="advanced">{c.advanced}</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="category">
            Categorie
          </label>
          <select
            id="category"
            name="category"
            className="input"
            defaultValue={car?.category ?? "B"}
          >
            <option value="B">B — autoturism</option>
            <option value="C">C — camion</option>
            <option value="D">D — autobuz</option>
            <option value="A">A — motocicletă</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="instructor_id">
            Șofer (instructor)
          </label>
          <select
            id="instructor_id"
            name="instructor_id"
            className="input"
            defaultValue={currentDriverId}
          >
            <option value="">— fără șofer</option>
            {instructors.map((i) => {
              const onOther = i.assigned_car_id && i.assigned_car_id !== car?.id;
              return (
                <option key={i.id} value={i.id}>
                  {i.full_name}
                  {!i.active ? " (inactiv)" : onOther ? " (are altă mașină)" : ""}
                </option>
              );
            })}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="itp_expiry">
            {c.itp}
          </label>
          <input
            id="itp_expiry"
            name="itp_expiry"
            type="date"
            className="input"
            defaultValue={car?.itp_expiry ?? ""}
          />
        </div>
        <div>
          <label className="label" htmlFor="insurance_expiry">
            {c.insurance}
          </label>
          <input
            id="insurance_expiry"
            name="insurance_expiry"
            type="date"
            className="input"
            defaultValue={car?.insurance_expiry ?? ""}
          />
        </div>
        <div>
          <label className="label" htmlFor="service_due">
            {c.service}
          </label>
          <input
            id="service_due"
            name="service_due"
            type="date"
            className="input"
            defaultValue={car?.service_due ?? ""}
          />
        </div>
        {car && (
          <div className="flex items-end">
            <label className="flex min-h-tap cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                name="active"
                defaultChecked={car.active}
                className="h-5 w-5 rounded border-slate-300 text-brand focus:ring-brand/30"
              />
              {c.active}
            </label>
          </div>
        )}
      </div>

      {err && <p className="text-sm font-medium text-status-noshow">{err}</p>}

      <div className="flex gap-2 pt-1">
        <button type="submit" className="btn-primary" disabled={pending}>
          <Icon name="check" size={18} />
          <span>{pending ? d.common.loading : d.common.save}</span>
        </button>
        <button
          type="button"
          className="btn-ghost"
          onClick={onCancel}
          disabled={pending}
        >
          {d.common.cancel}
        </button>
      </div>
    </form>
  );
}
