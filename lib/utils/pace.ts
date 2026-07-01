import { todayYmd } from "@/lib/utils/date";

/** Ritmul practicii față de perioada grupei. null = fără perioadă (nu evaluăm). */
export type PaceStatus = "ok" | "behind" | "critical" | null;

// Cat. B: ~24 lecții practice (12+12). Jumătate = 12. Prag critic = 20.
const HALF_TARGET = 12;
const RED_THRESHOLD = 20;
const TWO_WEEKS_MS = 14 * 86400000;

/**
 * Calculează ritmul practicii:
 *  - "critical" (roșu): cu ≤ 2 săptămâni înainte de final, sub 20 lecții practice efectuate.
 *  - "behind" (galben): la/după jumătatea cursului, sub jumătate din lecții efectuate.
 *  - "ok" altfel; null dacă grupa nu are dată de final.
 */
export function computePace(opts: {
  startDate: string | null | undefined;
  endDate: string | null | undefined;
  completedPractical: number;
  today?: string;
}): PaceStatus {
  const { startDate, endDate, completedPractical } = opts;
  if (!endDate) return null;

  const today = opts.today ?? todayYmd();
  const t = Date.parse(today.slice(0, 10) + "T00:00:00Z");
  const end = Date.parse(endDate.slice(0, 10) + "T00:00:00Z");
  if (Number.isNaN(t) || Number.isNaN(end)) return null;

  // Roșu are prioritate.
  if (t >= end - TWO_WEEKS_MS && completedPractical < RED_THRESHOLD) return "critical";

  if (startDate) {
    const start = Date.parse(startDate.slice(0, 10) + "T00:00:00Z");
    if (!Number.isNaN(start) && end > start) {
      const mid = start + (end - start) / 2;
      if (t >= mid && completedPractical < HALF_TARGET) return "behind";
    }
  }
  return "ok";
}
