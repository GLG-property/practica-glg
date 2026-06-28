import { Icon } from "@/components/icons";
import type { PaymentState } from "@/lib/db/types";

/** Badge de plată: verde = achitat, roșu = neachitat. */
export function PaymentBadge({
  state,
  labels,
}: {
  state: PaymentState | undefined;
  labels: { paid: string; unpaid: string; paidCashier: string; paidInstructor: string };
}) {
  // Verde DOAR pentru stările explicit achitate; orice altceva (inclusiv undefined) = roșu.
  const paid = state === "paid_cashier" || state === "paid_instructor";
  if (!paid) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-status-noshow/30 bg-status-noshow/10 px-2 py-0.5 text-xs font-semibold text-status-noshow">
        <Icon name="x" size={12} /> {labels.unpaid}
      </span>
    );
  }
  const title = state === "paid_instructor" ? labels.paidInstructor : labels.paidCashier;
  return (
    <span
      title={title}
      className="inline-flex shrink-0 items-center gap-1 rounded-full border border-status-completed/30 bg-status-completed/10 px-2 py-0.5 text-xs font-semibold text-status-completed"
    >
      <Icon name="check" size={12} /> {labels.paid}
    </span>
  );
}
