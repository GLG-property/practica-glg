"use client";

import { useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/provider";
import { Icon } from "@/components/icons";
import { LessonCard } from "@/components/LessonCard";
import {
  monthGrid,
  monthName,
  weekdayShorts,
  weekdayName,
  dateDMY,
  isSameDay,
  isSameMonth,
  addMonths,
  parseISO,
} from "@/lib/utils/date";
import type { LessonWithRelations, LangPref, LessonStatus } from "@/lib/db/types";

const DOT: Record<LessonStatus, string> = {
  scheduled: "bg-status-scheduled",
  completed: "bg-status-completed",
  no_show: "bg-status-noshow",
  cancelled: "bg-status-cancelled",
};

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

/** Calendar lunar vizual + agenda zilei selectate. */
export function CalendarView({
  lessons,
  monthISO,
  lang,
  basePath,
  query = "",
  showActions = false,
  showInstructor = false,
  studentBasePath,
}: {
  lessons: LessonWithRelations[];
  monthISO: string;
  lang: LangPref;
  basePath: string;
  query?: string;
  showActions?: boolean;
  showInstructor?: boolean;
  studentBasePath?: string;
}) {
  const { d } = useI18n();
  const month = new Date(monthISO + "T12:00:00");
  const today = new Date();
  const grid = monthGrid(month);

  // Grupăm lecțiile pe zi.
  const byDay = new Map<string, LessonWithRelations[]>();
  for (const l of lessons) {
    const key = ymd(parseISO(l.start_time));
    const arr = byDay.get(key) ?? [];
    arr.push(l);
    byDay.set(key, arr);
  }

  // Ziua selectată: azi dacă e în lună, altfel prima zi a lunii.
  const initial = isSameMonth(today, month) ? today : month;
  const [selected, setSelected] = useState<string>(ymd(initial));
  const selectedLessons = (byDay.get(selected) ?? []).sort((a, b) =>
    a.start_time < b.start_time ? -1 : 1
  );

  const q = query ? `&${query}` : "";
  const prevHref = `${basePath}?d=${ymd(addMonths(month, -1))}${q}`;
  const nextHref = `${basePath}?d=${ymd(addMonths(month, 1))}${q}`;
  const todayHref = `${basePath}?d=${ymd(today)}${q}`;

  return (
    <div className="space-y-4">
      {/* Antet lună + navigare */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-900">
          {monthName(month, lang)} {month.getFullYear()}
        </h3>
        <div className="flex items-center gap-1">
          <Link href={prevHref} className="btn-ghost h-9 w-9 p-0" aria-label="prev">
            <Icon name="back" size={18} />
          </Link>
          <Link href={todayHref} className="btn-secondary h-9 px-3 text-xs">
            {d.common.today}
          </Link>
          <Link href={nextHref} className="btn-ghost h-9 w-9 p-0" aria-label="next">
            <Icon name="next" size={18} />
          </Link>
        </div>
      </div>

      {/* Grila calendar */}
      <div className="card p-3">
        <div className="grid grid-cols-7 gap-1 mb-1">
          {weekdayShorts(lang).map((w) => (
            <div key={w} className="text-center text-[11px] font-semibold text-slate-400 py-1">
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {grid.map((day) => {
            const key = ymd(day);
            const dayLessons = byDay.get(key) ?? [];
            const inMonth = isSameMonth(day, month);
            const isToday = isSameDay(day, today);
            const isSelected = key === selected;

            return (
              <button
                key={key}
                onClick={() => setSelected(key)}
                className={[
                  "relative flex flex-col items-center justify-start rounded-lg aspect-square pt-1.5 transition-colors",
                  isSelected
                    ? "bg-brand text-white"
                    : isToday
                    ? "bg-brand-50 text-brand"
                    : inMonth
                    ? "text-slate-700 hover:bg-slate-100"
                    : "text-slate-300",
                ].join(" ")}
              >
                <span className={`text-xs font-semibold ${isToday && !isSelected ? "ring-1 ring-brand rounded-full px-1.5" : ""}`}>
                  {day.getDate()}
                </span>
                {/* Indicatori lecții */}
                {dayLessons.length > 0 && (
                  <span className="mt-1 flex gap-0.5">
                    {dayLessons.slice(0, 3).map((l, i) => (
                      <span
                        key={i}
                        className={`h-1.5 w-1.5 rounded-full ${
                          isSelected ? "bg-white/90" : DOT[l.status]
                        }`}
                      />
                    ))}
                  </span>
                )}
                {dayLessons.length > 3 && (
                  <span className={`text-[9px] leading-none mt-0.5 ${isSelected ? "text-white/90" : "text-slate-400"}`}>
                    +{dayLessons.length - 3}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Agenda zilei selectate */}
      <div>
        <div className="flex items-baseline justify-between mb-2">
          <h4 className="section-title capitalize">
            {weekdayName(new Date(selected + "T12:00:00"), lang)},{" "}
            {dateDMY(new Date(selected + "T12:00:00").toISOString())}
          </h4>
          {selectedLessons.length > 0 && (
            <span className="rounded-full bg-brand-50 text-brand text-xs font-semibold px-2 py-0.5">
              {selectedLessons.length}
            </span>
          )}
        </div>
        {selectedLessons.length === 0 ? (
          <div className="card text-center py-8 text-slate-400 text-sm">{d.today.empty}</div>
        ) : (
          <ul className="space-y-2.5">
            {selectedLessons.map((l) => (
              <li key={l.id}>
                <LessonCard
                  lesson={l}
                  showActions={showActions}
                  showInstructor={showInstructor}
                  studentHref={studentBasePath ? `${studentBasePath}/${l.student?.id}` : undefined}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
