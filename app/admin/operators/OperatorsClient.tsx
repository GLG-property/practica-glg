"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/provider";
import { Icon } from "@/components/icons";
import type { LangPref } from "@/lib/db/types";
import {
  createOperatorAction,
  updateOperatorAction,
} from "@/app/admin/actions/operators";

export type OperatorLite = {
  id: string;
  full_name: string;
  phone: string | null;
  language_pref: LangPref;
  active: boolean;
};

export function OperatorsClient({ operators }: { operators: OperatorLite[] }) {
  const { d } = useI18n();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="page-title">{d.operators.title}</h1>
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            setAdding((v) => !v);
            setEditingId(null);
          }}
        >
          <Icon name={adding ? "x" : "plus"} size={18} />
          {adding ? d.common.cancel : d.operators.addNew}
        </button>
      </div>

      {adding && (
        <OperatorForm
          mode="create"
          onDone={() => setAdding(false)}
          onCancel={() => setAdding(false)}
        />
      )}

      {operators.length === 0 && !adding ? (
        <div className="card text-center text-sm text-slate-500">
          {d.common.noData}
        </div>
      ) : (
        <div className="space-y-2.5">
          {operators.map((op) =>
            editingId === op.id ? (
              <OperatorForm
                key={op.id}
                mode="edit"
                operator={op}
                onDone={() => setEditingId(null)}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <OperatorRow
                key={op.id}
                operator={op}
                onEdit={() => {
                  setEditingId(op.id);
                  setAdding(false);
                }}
              />
            )
          )}
        </div>
      )}
    </div>
  );
}

function OperatorRow({
  operator,
  onEdit,
}: {
  operator: OperatorLite;
  onEdit: () => void;
}) {
  const { d } = useI18n();
  return (
    <div className="card flex items-center gap-3">
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand">
        <Icon name="users" size={20} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-slate-900 truncate">
          {operator.full_name}
        </p>
        <p className="text-sm text-slate-500 truncate">
          {operator.phone || d.common.none}
          <span className="text-slate-300"> · </span>
          {operator.language_pref.toUpperCase()}
        </p>
      </div>
      <span
        className={
          "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold " +
          (operator.active
            ? "bg-emerald-50 text-emerald-700"
            : "bg-slate-100 text-slate-500")
        }
      >
        {operator.active ? d.cars.active : "Inactiv"}
      </span>
      <button
        type="button"
        className="btn-ghost px-2.5 min-h-tap"
        onClick={onEdit}
        title={d.common.edit}
        aria-label={d.common.edit}
      >
        <Icon name="edit" size={18} />
      </button>
    </div>
  );
}

function OperatorForm({
  mode,
  operator,
  onDone,
  onCancel,
}: {
  mode: "create" | "edit";
  operator?: OperatorLite;
  onDone: () => void;
  onCancel: () => void;
}) {
  const { d } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState(operator?.full_name ?? "");
  const [phone, setPhone] = useState(operator?.phone ?? "");
  const [language, setLanguage] = useState<LangPref>(
    operator?.language_pref ?? "ro"
  );
  const [active, setActive] = useState(operator?.active ?? true);
  const [code, setCode] = useState("");

  function submit() {
    setError(null);
    const name = fullName.trim();
    if (!name) {
      setError("Numele e obligatoriu.");
      return;
    }
    const codeTrim = code.trim();
    if (mode === "create" && !/^\d{5}$/.test(codeTrim)) {
      setError("Codul trebuie să aibă 5 cifre.");
      return;
    }
    if (mode === "edit" && codeTrim && !/^\d{5}$/.test(codeTrim)) {
      setError("Codul trebuie să aibă 5 cifre.");
      return;
    }

    startTransition(async () => {
      let res: { ok: boolean; error?: string } | undefined;
      if (mode === "create") {
        const fd = new FormData();
        fd.set("full_name", name);
        fd.set("phone", phone.trim());
        fd.set("language_pref", language);
        fd.set("code", codeTrim);
        res = await createOperatorAction(fd);
      } else {
        res = await updateOperatorAction({
          id: operator!.id,
          full_name: name,
          phone: phone.trim() || null,
          language_pref: language,
          active,
          code: codeTrim || null,
        });
      }
      if (res?.ok) {
        router.refresh();
        onDone();
      } else {
        setError(
          res?.error === "code"
            ? "Cod invalid (5 cifre)."
            : d.common.error
        );
      }
    });
  }

  return (
    <div className="card space-y-3">
      <p className="section-title">
        {mode === "create" ? d.operators.addNew : d.common.edit}
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label">Nume complet</label>
          <input
            className="input"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Nume Prenume"
            autoFocus
          />
        </div>

        <div>
          <label className="label">{d.students.phone}</label>
          <input
            className="input"
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+373…"
          />
        </div>

        <div>
          <label className="label">{d.lang.switch}</label>
          <select
            className="input"
            value={language}
            onChange={(e) => setLanguage(e.target.value as LangPref)}
          >
            <option value="ro">{d.lang.ro}</option>
            <option value="ru">{d.lang.ru}</option>
          </select>
        </div>

        <div className={mode === "edit" ? "" : "sm:col-span-2"}>
          <label className="label">
            {mode === "create" ? d.operators.code : "Resetează cod (opțional)"}
          </label>
          <input
            className="input tracking-widest"
            type="text"
            inputMode="numeric"
            maxLength={5}
            value={code}
            onChange={(e) =>
              setCode(e.target.value.replace(/\D/g, "").slice(0, 5))
            }
            placeholder="•••••"
            autoComplete="off"
          />
        </div>

        {mode === "edit" && (
          <div className="flex items-end">
            <label className="inline-flex items-center gap-2 min-h-tap cursor-pointer select-none">
              <input
                type="checkbox"
                className="h-5 w-5 rounded border-slate-300 text-brand focus:ring-brand/30"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
              />
              <span className="text-sm font-medium text-slate-700">
                {d.cars.active}
              </span>
            </label>
          </div>
        )}
      </div>

      {error && <p className="text-sm font-medium text-status-noshow">{error}</p>}

      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          className="btn-primary"
          onClick={submit}
          disabled={pending}
        >
          <Icon name="check" size={18} />
          {pending ? d.common.loading : d.common.save}
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={onCancel}
          disabled={pending}
        >
          {d.common.cancel}
        </button>
      </div>
    </div>
  );
}
