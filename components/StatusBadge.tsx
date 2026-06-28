import type { LessonStatus } from "@/lib/db/types";

const STYLES: Record<LessonStatus, string> = {
  scheduled: "bg-status-scheduled/15 text-status-scheduled border-status-scheduled/30",
  completed: "bg-status-completed/15 text-status-completed border-status-completed/30",
  no_show: "bg-status-noshow/15 text-status-noshow border-status-noshow/30",
  cancelled: "bg-status-cancelled/15 text-status-cancelled border-status-cancelled/40",
};

/** Badge colorat pentru statusul unei lecții. `label` vine deja tradus. */
export function StatusBadge({
  status,
  label,
}: {
  status: LessonStatus;
  label: string;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${STYLES[status]}`}
    >
      {label}
    </span>
  );
}
