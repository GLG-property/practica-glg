"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/provider";
import { Icon } from "@/components/icons";
import { setPhase2UnlockedAction } from "@/app/admin/actions/students";

/** Comutator: deblochează manual faza 2 (Scala) pentru un cursant. Doar admin. */
export function Phase2UnlockClient({
  studentId,
  unlocked,
}: {
  studentId: string;
  unlocked: boolean;
}) {
  const { d } = useI18n();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    const res = await setPhase2UnlockedAction(studentId, !unlocked);
    setBusy(false);
    if (res.ok) router.refresh();
  }

  return (
    <div className="card flex items-center gap-3">
      <div
        className={
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full " +
          (unlocked ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400")
        }
      >
        <Icon name={unlocked ? "check" : "clock"} size={20} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-slate-900">{d.students.phase2Manual}</p>
        <p className="text-sm text-slate-500">
          {unlocked ? d.students.phase2OnHint : d.students.phase2OffHint}
        </p>
      </div>
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        className={unlocked ? "btn-ghost shrink-0" : "btn-primary shrink-0"}
      >
        {busy ? d.common.loading : unlocked ? d.students.phase2Relock : d.students.phase2Unlock}
      </button>
    </div>
  );
}
