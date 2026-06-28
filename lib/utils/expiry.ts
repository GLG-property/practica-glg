import type { Car } from "@/lib/db/types";

export type ExpiryLevel = "ok" | "soon" | "expired";

// Pragul "expiră curând" (zile).
const SOON_DAYS = 30;

/** Nivelul de alertă pentru o dată de scadență. */
export function expiryLevel(dateStr: string | null): ExpiryLevel {
  if (!dateStr) return "ok";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  const diffDays = Math.floor((target.getTime() - today.getTime()) / 86400000);
  if (diffDays < 0) return "expired";
  if (diffDays <= SOON_DAYS) return "soon";
  return "ok";
}

/** Cel mai grav nivel dintre ITP, asigurare, revizie. */
export function carWorstExpiry(car: Car): ExpiryLevel {
  const levels = [
    expiryLevel(car.itp_expiry),
    expiryLevel(car.insurance_expiry),
    expiryLevel(car.service_due),
  ];
  if (levels.includes("expired")) return "expired";
  if (levels.includes("soon")) return "soon";
  return "ok";
}

export function expiryClasses(level: ExpiryLevel): string {
  switch (level) {
    case "expired":
      return "bg-status-noshow/15 text-status-noshow border-status-noshow/40";
    case "soon":
      return "bg-amber-100 text-amber-700 border-amber-300";
    default:
      return "bg-status-completed/15 text-status-completed border-status-completed/30";
  }
}
