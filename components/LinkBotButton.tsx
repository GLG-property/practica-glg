"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { Icon } from "@/components/icons";
import { generateLinkCodeAction } from "@/app/actions/lessons";

/** Buton care generează un cod de legare pentru notificările cursantului. */
export function LinkBotButton({
  studentId,
  existingCode,
  linked,
}: {
  studentId: string;
  existingCode: string | null;
  linked: boolean;
}) {
  const { d, fmt } = useI18n();
  const [code, setCode] = useState<string | null>(existingCode);
  const [busy, setBusy] = useState(false);

  if (linked) {
    return (
      <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-status-completed">
        <Icon name="check" size={16} /> {d.notif.enabled}
      </p>
    );
  }

  async function gen() {
    setBusy(true);
    const res = await generateLinkCodeAction(studentId);
    setBusy(false);
    if (res.ok) setCode(res.code);
  }

  return (
    <div>
      <button onClick={gen} disabled={busy} className="btn-secondary">
        <Icon name="link" size={15} /> {d.students.linkBot}
      </button>
      {code && (
        <p className="mt-2 text-sm font-bold text-brand">
          {fmt(d.students.linkCode, { code })}
        </p>
      )}
    </div>
  );
}
