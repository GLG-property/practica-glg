"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/provider";
import { StatusBadge } from "@/components/StatusBadge";
import { PaymentBadge } from "@/components/PaymentBadge";
import { Icon } from "@/components/icons";
import { timeHM } from "@/lib/utils/date";
import { studentName, type LessonWithRelations, type LessonStatus } from "@/lib/db/types";
import { markLessonAction, markPaymentAction } from "@/app/actions/lessons";

const ACCENT: Record<LessonStatus, string> = {
  scheduled: "border-l-status-scheduled",
  completed: "border-l-status-completed",
  no_show: "border-l-status-noshow",
  cancelled: "border-l-status-cancelled",
};

export function LessonCard({
  lesson,
  showActions = true,
  showInstructor = false,
  allowPayment = false,
  studentHref,
}: {
  lesson: LessonWithRelations;
  showActions?: boolean;
  showInstructor?: boolean;
  allowPayment?: boolean;
  studentHref?: string;
}) {
  const { d } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const phone = lesson.student?.phone;
  const name = lesson.student ? studentName(lesson.student) : "—";
  const href = studentHref && lesson.student ? studentHref : undefined;
  // Lecția a început? (comparăm instant-uri UTC — corect indiferent de fus orar)
  const started = new Date(lesson.start_time).getTime() <= Date.now();

  function mark(status: LessonStatus) {
    startTransition(async () => {
      await markLessonAction({ lessonId: lesson.id, status });
      router.refresh();
    });
  }
  function togglePaid(paid: boolean) {
    startTransition(async () => {
      await markPaymentAction({ lessonId: lesson.id, paid });
      router.refresh();
    });
  }

  const payLabels = {
    paid: d.payment.paid, unpaid: d.payment.unpaid,
    paidCashier: d.payment.paidCashier, paidInstructor: d.payment.paidInstructor,
  };

  return (
    <div className={`card border-l-4 ${ACCENT[lesson.status]} p-3.5`}>
      <div className="flex items-start gap-3">
        <div className="flex flex-col items-center justify-center rounded-lg bg-slate-50 px-2.5 py-1.5 min-w-[58px]">
          <span className="text-lg font-bold tabular-nums leading-none text-slate-900">{timeHM(lesson.start_time)}</span>
          <span className="text-[11px] text-slate-400 tabular-nums mt-0.5">{timeHM(lesson.end_time)}</span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            {href ? (
              <Link href={href} className="min-w-0 truncate text-base font-semibold text-slate-900 hover:text-brand">{name}</Link>
            ) : (
              <span className="min-w-0 truncate text-base font-semibold text-slate-900">{name}</span>
            )}
            <div className="flex shrink-0 flex-col items-end gap-1">
              <StatusBadge status={lesson.status} label={d.status[lesson.status]} />
              <PaymentBadge state={lesson.payment_state} labels={payLabels} />
            </div>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
            <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 text-xs font-medium text-slate-600">
              {d.lesson.phase} {lesson.phase}
            </span>
            {showInstructor && lesson.instructor && (
              <span className="inline-flex items-center gap-1"><Icon name="users" size={14} /> {lesson.instructor.full_name}</span>
            )}
            {lesson.car && (
              <span className="inline-flex items-center gap-1"><Icon name="car" size={14} /> {lesson.car.plate}</span>
            )}
          </div>
        </div>
      </div>

      {(phone || (showActions && lesson.status === "scheduled") || (allowPayment && lesson.payment_state === "unpaid")) && (
        <div className="mt-3 space-y-2">
          {/* Plată cash de către instructor */}
          {allowPayment && lesson.payment_state === "unpaid" && (
            <button disabled={pending} onClick={() => togglePaid(true)} className="btn-success w-full text-xs">
              <Icon name="check" size={15} /> {d.payment.markPaid}
            </button>
          )}

          {phone && (
            <div className="flex gap-2">
              <a href={`tel:${phone}`} className="btn-secondary flex-1 text-xs"><Icon name="phone" size={15} /> {d.today.call}</a>
              <a href={`sms:${phone}`} className="btn-secondary flex-1 text-xs"><Icon name="message" size={15} /> {d.today.sms}</a>
            </div>
          )}

          {showActions && lesson.status === "scheduled" && (
            started ? (
              <div className="flex gap-2">
                <button disabled={pending} onClick={() => mark("completed")} className="btn-success flex-1 text-xs"><Icon name="check" size={15} /> {d.today.markCompleted}</button>
                <button disabled={pending} onClick={() => mark("no_show")} className="btn-danger flex-1 text-xs"><Icon name="x" size={15} /> {d.today.markNoShow}</button>
                <button disabled={pending} onClick={() => mark("cancelled")} className="btn-secondary text-xs">{d.today.markCancelled}</button>
              </div>
            ) : (
              // Lecție viitoare: nu poți marca „efectuat/absent" încă — doar anulare.
              <button disabled={pending} onClick={() => mark("cancelled")} className="btn-secondary w-full text-xs">{d.today.markCancelled}</button>
            )
          )}
        </div>
      )}
    </div>
  );
}
