import Link from "next/link";
import { requireOperator } from "@/lib/auth/session";
import { getDict } from "@/lib/i18n/dictionaries";
import { getAllInstructors, getLessonsRange } from "@/lib/db/queries";
import { CalendarView } from "@/components/CalendarView";
import { Icon } from "@/components/icons";
import { monthRange } from "@/lib/utils/date";
import type { LessonWithRelations } from "@/lib/db/types";

export const dynamic = "force-dynamic";

export default async function OperatorCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ instructor?: string; d?: string; scope?: string }>;
}) {
  const s = await requireOperator();
  const d = getDict(s.language_pref);
  const sp = await searchParams;

  const scope = sp.scope === "all" ? "all" : "mine"; // implicit: instructorii mei
  const allInstructors = (await getAllInstructors()).filter((i) => i.active);
  const instructors =
    scope === "mine" ? allInstructors.filter((i) => i.operator_id === s.id) : allInstructors;
  const instructorId = sp.instructor || "";
  const base = sp.d ? new Date(sp.d + "T12:00:00") : new Date();
  const monthISO = base.toISOString().slice(0, 10);

  let lessons: LessonWithRelations[] = [];
  if (instructorId) {
    const range = monthRange(base);
    lessons = await getLessonsRange({ start: range.start, end: range.end, instructorId });
  }

  return (
    <div className="space-y-4">
      <h1 className="page-title">{d.instructors.calendar}</h1>

      {/* Instructorii mei / toți instructorii */}
      <div className="flex rounded-lg bg-slate-100 p-0.5 w-fit">
        {(["mine", "all"] as const).map((sc) => (
          <Link
            key={sc}
            href={"/operator/calendar?scope=" + sc}
            className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
              scope === sc ? "bg-white text-brand shadow-sm" : "text-slate-500"
            }`}
          >
            {sc === "mine" ? d.operators.myInstructors : d.operators.allInstructors}
          </Link>
        ))}
      </div>

      <form method="GET" className="card">
        <input type="hidden" name="scope" value={scope} />
        <label className="label" htmlFor="instructor">
          {d.lesson.instructor}
        </label>
        <div className="flex gap-2">
          <select id="instructor" name="instructor" defaultValue={instructorId} className="input">
            <option value="">{d.common.select}</option>
            {instructors.map((i) => (
              <option key={i.id} value={i.id}>
                {i.full_name}
              </option>
            ))}
          </select>
          <input type="hidden" name="d" value={sp.d ?? ""} />
          <button type="submit" className="btn-primary shrink-0">
            <Icon name="search" size={16} /> {d.common.open}
          </button>
        </div>
      </form>

      {instructorId ? (
        <CalendarView
          lessons={lessons}
          monthISO={monthISO}
          basePath="/operator/calendar"
          query={"scope=" + scope + "&instructor=" + instructorId}
          lang={s.language_pref}
          showInstructor
          studentBasePath="/operator/students"
        />
      ) : (
        <div className="card text-center py-10">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-3">
            <Icon name="calendar" size={24} />
          </span>
          <p className="text-sm text-slate-500">{d.operators.pickInstructor}</p>
        </div>
      )}
    </div>
  );
}
