// Logica de plată — pură (folosibilă pe server și pe client).
// Plata se ține în ORE: elevul achită la casă `paid_hours`. O lecție = `duration_hours`
// (implicit 1.5). Lecțiile consumă ore în ordine cronologică. O lecție e ACOPERITĂ
// dacă la începutul ei mai exista sold plătit (deci „1 oră achitată" acoperă prima lecție
// de 1.5h). O lecție e:
//   - paid_instructor : instructorul a încasat cash (override) -> verde
//   - paid_cashier    : acoperită de orele achitate la casă     -> verde
//   - unpaid          : peste orele achitate, neîncasată         -> roșu

import type { Lesson, PaymentState } from "@/lib/db/types";

type PayLesson = Pick<
  Lesson,
  "id" | "start_time" | "status" | "duration_hours" | "payment_by_instructor"
>;

// Statusurile care consumă din orele plătite (planificate + efectuate).
const CONSUMING: Lesson["status"][] = ["scheduled", "completed"];

/**
 * Calculează starea de plată pentru fiecare lecție a unui elev.
 * Întoarce Map<lessonId, PaymentState>.
 */
export function computePaymentStates(
  lessons: PayLesson[],
  paidHours: number
): Map<string, PaymentState> {
  // Ordonare totală cu tiebreak pe id (sort stabil, determinist).
  const ordered = [...lessons].sort((a, b) =>
    a.start_time < b.start_time ? -1 : a.start_time > b.start_time ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0
  );
  const result = new Map<string, PaymentState>();
  let consumed = 0;

  for (const l of ordered) {
    if (l.payment_by_instructor) {
      result.set(l.id, "paid_instructor");
      // Lecția plătită cash NU mai consumă din pool-ul de la casă.
      continue;
    }
    if (!CONSUMING.includes(l.status)) {
      // Anulat / nu s-a prezentat: nu consumă, nu se cere plată.
      result.set(l.id, "paid_cashier");
      continue;
    }
    // Acoperită dacă mai era sold plătit la ÎNCEPUTUL lecției (regulă „lenientă").
    const covered = consumed < paidHours - 1e-6;
    result.set(l.id, covered ? "paid_cashier" : "unpaid");
    consumed += Number(l.duration_hours || 0);
  }
  return result;
}

/** Verde dacă e achitat (la casă sau la instructor), roșu dacă neachitat. */
export function isPaid(state: PaymentState | undefined): boolean {
  return state === "paid_cashier" || state === "paid_instructor";
}
