"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/provider";
import { addRemarkAction } from "@/app/actions/lessons";

/** Formular pentru adăugarea unei remarci (+ screenshot opțional) la un cursant. */
export function RemarkForm({
  studentId,
  lessonId,
}: {
  studentId: string;
  lessonId?: string;
}) {
  const { d } = useI18n();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setDone(false);
    const fd = new FormData(e.currentTarget);
    fd.set("studentId", studentId);
    if (lessonId) fd.set("lessonId", lessonId);
    const res = await addRemarkAction(fd);
    setBusy(false);
    if (res.ok) {
      formRef.current?.reset();
      setDone(true);
      router.refresh();
    }
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-3">
      <textarea
        name="text"
        required
        rows={3}
        placeholder={d.students.remarkPlaceholder}
        className="input"
      />
      <div>
        <label className="label" htmlFor="screenshot">
          {d.lesson.addScreenshot}
        </label>
        <input
          id="screenshot"
          name="screenshot"
          type="file"
          accept="image/*"
          className="input"
        />
      </div>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={busy} className="btn-primary">
          {busy ? d.common.loading : d.students.addRemark}
        </button>
        {done && <span className="text-status-completed font-semibold">{d.common.saved}</span>}
      </div>
    </form>
  );
}
