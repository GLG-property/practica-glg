"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/provider";
import { setPaidHoursOperatorAction } from "@/app/operator/actions";

export function PaidHoursForm({ studentId, current }: { studentId: string; current: number }) {
  const { d } = useI18n();
  const router = useRouter();
  const [hours, setHours] = useState(String(current));
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setDone(false);
    setError(false);
    const res = await setPaidHoursOperatorAction(studentId, Number(hours));
    setBusy(false);
    if (res.ok) {
      setDone(true);
      router.refresh();
    } else {
      setError(true);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex items-end gap-2">
      <div className="flex-1">
        <label className="label" htmlFor="paid-hours">
          {d.payment.paidHours}
        </label>
        <input
          id="paid-hours"
          type="number"
          min="0"
          step="0.5"
          value={hours}
          onChange={(e) => {
            setHours(e.target.value);
            setDone(false);
            setError(false);
          }}
          className="input"
        />
      </div>
      <button type="submit" disabled={busy} className="btn-primary shrink-0">
        {busy ? d.common.loading : d.common.save}
      </button>
      {done && (
        <span className="text-status-completed font-semibold text-sm pb-3 shrink-0">
          {d.common.saved}
        </span>
      )}
      {error && (
        <span className="text-status-noshow font-semibold text-sm pb-3 shrink-0">
          {d.common.error}
        </span>
      )}
    </form>
  );
}
