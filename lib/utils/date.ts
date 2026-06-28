// Utilitare de dată/oră. Lucrăm cu ISO strings (timestamptz din Postgres).
// IMPORTANT: orele introduse (ex. 09:00) sunt interpretate în fusul afacerii
// (Europe/Chișinău, configurabil prin APP_TIMEZONE), NU în fusul serverului.
// Astfel, ora salvată și ora afișată coincid indiferent unde rulează aplicația.

import {
  format,
  parseISO,
  startOfWeek,
  startOfMonth,
  addDays,
  addMonths,
  isSameDay,
  isSameMonth,
} from "date-fns";
import { fromZonedTime, formatInTimeZone } from "date-fns-tz";

// Fusul orar al școlii. Poate fi suprascris prin variabila de mediu APP_TIMEZONE.
export const BUSINESS_TZ = process.env.APP_TIMEZONE || "Europe/Chisinau";

/** Ora în format HH:mm (în fusul afacerii). */
export function timeHM(iso: string): string {
  return formatInTimeZone(parseISO(iso), BUSINESS_TZ, "HH:mm");
}

/** Data în format zi.lună.an (în fusul afacerii). */
export function dateDMY(iso: string): string {
  return formatInTimeZone(parseISO(iso), BUSINESS_TZ, "dd.MM.yyyy");
}

/** Data + ora (în fusul afacerii). */
export function dateTime(iso: string): string {
  return formatInTimeZone(parseISO(iso), BUSINESS_TZ, "dd.MM.yyyy HH:mm");
}

/** YYYY-MM-DD al unei date, în fusul afacerii. */
function ymdInTz(date: Date): string {
  return formatInTimeZone(date, BUSINESS_TZ, "yyyy-MM-dd");
}

/** YYYY-MM-DD (în fusul afacerii) dintr-un ISO. */
export function isoToYmd(iso: string): string {
  return formatInTimeZone(parseISO(iso), BUSINESS_TZ, "yyyy-MM-dd");
}

/** Interval [start, end] al unei zile calendaristice (în fusul afacerii), ca ISO UTC. */
export function dayRange(date: Date): { start: string; end: string } {
  const ymd = ymdInTz(date);
  return {
    start: fromZonedTime(`${ymd}T00:00:00`, BUSINESS_TZ).toISOString(),
    end: fromZonedTime(`${ymd}T23:59:59.999`, BUSINESS_TZ).toISOString(),
  };
}

/** Interval [start, end] al săptămânii (luni–duminică, în fusul afacerii), ca ISO UTC. */
export function weekRange(date: Date): { start: string; end: string } {
  const ymd = ymdInTz(date);
  // Calcul calendaristic în UTC (la prânz, ca să evităm marginile).
  const base = new Date(`${ymd}T12:00:00Z`);
  const dow = (base.getUTCDay() + 6) % 7; // luni = 0
  const monday = new Date(base);
  monday.setUTCDate(base.getUTCDate() - dow);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  return {
    start: fromZonedTime(`${monday.toISOString().slice(0, 10)}T00:00:00`, BUSINESS_TZ).toISOString(),
    end: fromZonedTime(`${sunday.toISOString().slice(0, 10)}T23:59:59.999`, BUSINESS_TZ).toISOString(),
  };
}

/** Cele 7 zile ale săptămânii care conține `date` (pentru afișare client). */
export function weekDays(date: Date): Date[] {
  const start = startOfWeek(date, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** Interval [start, end] al lunii (în fusul afacerii), ca ISO UTC. */
export function monthRange(date: Date): { start: string; end: string } {
  const ym = formatInTimeZone(date, BUSINESS_TZ, "yyyy-MM");
  const [y, m] = ym.split("-").map(Number);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate(); // ultima zi a lunii
  return {
    start: fromZonedTime(`${ym}-01T00:00:00`, BUSINESS_TZ).toISOString(),
    end: fromZonedTime(`${ym}-${String(lastDay).padStart(2, "0")}T23:59:59.999`, BUSINESS_TZ).toISOString(),
  };
}

/** Grila de 6 săptămâni (42 de zile) care acoperă luna lui `date` (afișare client). */
export function monthGrid(date: Date): Date[] {
  const start = startOfWeek(startOfMonth(date), { weekStartsOn: 1 });
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

const MONTHS_RO = [
  "Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie",
  "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie",
];
const MONTHS_RU = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

export function monthName(date: Date, lang: "ro" | "ru"): string {
  return (lang === "ru" ? MONTHS_RU : MONTHS_RO)[date.getMonth()];
}

const WEEKDAYS_SHORT_RO = ["L", "Ma", "Mi", "J", "V", "S", "D"];
const WEEKDAYS_SHORT_RU = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export function weekdayShorts(lang: "ro" | "ru"): string[] {
  return lang === "ru" ? WEEKDAYS_SHORT_RU : WEEKDAYS_SHORT_RO;
}

export { isSameDay, isSameMonth, addDays, addMonths, parseISO, format };

/** Construiește un ISO UTC dintr-o dată (YYYY-MM-DD) și oră (HH:mm), în fusul afacerii. */
export function combineDateTime(dateStr: string, timeStr: string): string {
  return fromZonedTime(`${dateStr}T${timeStr}:00`, BUSINESS_TZ).toISOString();
}

/** Adaugă ore la un ISO și întoarce ISO. */
export function addHoursISO(iso: string, hours: number): string {
  const d = parseISO(iso);
  d.setMinutes(d.getMinutes() + Math.round(hours * 60));
  return d.toISOString();
}

const WEEKDAYS_RO = ["Duminică", "Luni", "Marți", "Miercuri", "Joi", "Vineri", "Sâmbătă"];
const WEEKDAYS_RU = ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"];

/** Numele zilei (în fusul afacerii). Index 0 = Duminică. */
export function weekdayName(date: Date, lang: "ro" | "ru"): string {
  const iso = Number(formatInTimeZone(date, BUSINESS_TZ, "i")); // 1=Luni..7=Duminică
  return (lang === "ru" ? WEEKDAYS_RU : WEEKDAYS_RO)[iso % 7];
}
