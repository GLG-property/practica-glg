import "server-only";
import { getLessonsRange } from "@/lib/db/queries";
import { dateDMY, timeHM, combineDateTime } from "@/lib/utils/date";
import { studentName, type LessonStatus, type PaymentState } from "@/lib/db/types";
import { isPaid } from "@/lib/payments";

export interface ReportRow {
  date: string;
  time: string;
  instructor: string;
  student: string;
  car: string;
  phase: number;
  status: LessonStatus;
  payment: PaymentState;
}

export interface ReportData {
  rows: ReportRow[];
  summary: {
    total: number;
    completed: number;
    no_show: number;
    cancelled: number;
    scheduled: number;
    noShowRate: number;
    unpaid: number;
    cashByInstructor: number;
  };
  range: { from: string; to: string };
}

export async function getReportData(filters: {
  from?: string;
  to?: string;
  instructorId?: string;
}): Promise<ReportData> {
  const now = new Date();
  const from =
    filters.from && /^\d{4}-\d{2}-\d{2}$/.test(filters.from)
      ? filters.from
      : new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const to =
    filters.to && /^\d{4}-\d{2}-\d{2}$/.test(filters.to)
      ? filters.to
      : now.toISOString().slice(0, 10);

  const lessons = await getLessonsRange({
    start: combineDateTime(from, "00:00"),
    end: combineDateTime(to, "23:59"),
    instructorId: filters.instructorId || undefined,
  });

  const rows: ReportRow[] = lessons.map((l) => ({
    date: dateDMY(l.start_time),
    time: timeHM(l.start_time),
    instructor: l.instructor?.full_name ?? "—",
    student: l.student ? studentName(l.student) : "—",
    car: l.car ? `${l.car.model} (${l.car.plate})` : "—",
    phase: l.phase,
    status: l.status,
    payment: l.payment_state ?? "unpaid",
  }));

  const count = (s: LessonStatus) => lessons.filter((l) => l.status === s).length;
  const decided = count("completed") + count("no_show");

  return {
    rows,
    summary: {
      total: lessons.length,
      completed: count("completed"),
      no_show: count("no_show"),
      cancelled: count("cancelled"),
      scheduled: count("scheduled"),
      noShowRate: decided ? Math.round((count("no_show") / decided) * 100) : 0,
      unpaid: lessons.filter((l) => !isPaid(l.payment_state)).length,
      cashByInstructor: lessons.filter((l) => l.payment_state === "paid_instructor").length,
    },
    range: { from, to },
  };
}

export const STATUS_LABEL_RO: Record<LessonStatus, string> = {
  scheduled: "Programat",
  completed: "Efectuat",
  no_show: "Nu s-a prezentat",
  cancelled: "Anulat",
};

export const PAYMENT_LABEL_RO: Record<PaymentState, string> = {
  paid_cashier: "Achitat (casă)",
  paid_instructor: "Achitat (instructor)",
  unpaid: "Neachitat",
};
