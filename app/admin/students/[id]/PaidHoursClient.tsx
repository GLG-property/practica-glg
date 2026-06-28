"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/provider";
import { Icon } from "@/components/icons";
import { setPaidHoursAction } from "@/app/admin/actions/students";

/** Editor pentru orele achitate ale unui cursant (doar admin). */
export function PaidHoursClient({
  studentId,
  current,
}: {
  studentId: string;
  current: number;
}) {
  const { d } = useI18n();
  const router = useRouter();
  const [value, setValue] = useState(String(current));
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(false);

  async function save() {
    const hours = Number(value);
    if (!Number.isFinite(hours) || hours < 0) {
      setError(true);
      return;
    }
    setBusy(true);
    setDone(false);
    setError(false);
    const res = await setPaidHoursAction(studentId, hours);
    setBusy(false);
    if (res.ok) {
      setDone(true);
      router.refresh();
    } else {
      setError(true);
    }
  }

  return (
    <div className="card">
      <label className="label flex items-center gap-1.5" htmlFor="paid_hours">
        <Icon name="clock" size={16} /> {d.payment.setPaidHours}
      </label>
      <div className="flex items-center gap-2">
        <input
          id="paid_hours"
          type="number"
          min={0}
          step={0.5}
          inputMode="decimal"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setDone(false);
            setError(false);
          }}
          className="input w-28"
        />
        <span className="text-sm text-slate-500">{d.lesson.hours}</span>
        <button onClick={save} disabled={busy} className="btn-primary ml-auto">
          {busy ? d.common.loading : d.common.save}
        </button>
      </div>
      {done && (
        <p className="mt-2 text-sm font-semibold text-status-completed">{d.common.saved}</p>
      )}
      {error && (
        <p className="mt-2 text-sm font-semibold text-status-noshow">{d.common.error}</p>
      )}
    </div>
  );
}
