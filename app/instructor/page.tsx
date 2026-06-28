import { requireInstructor } from "@/lib/auth/session";
import { getDict } from "@/lib/i18n/dictionaries";
import { getInstructorLessonsRange } from "@/lib/db/queries";
import { LessonCard } from "@/components/LessonCard";
import { Icon, type IconName } from "@/components/icons";
import { dayRange, addDays, isSameDay, parseISO } from "@/lib/utils/date";

export const dynamic = "force-dynamic";

export default async function InstructorTodayPage() {
  const s = await requireInstructor();
  const d = getDict(s.language_pref);

  const today = new Date();
  const tomorrow = addDays(today, 1);
  const startISO = dayRange(today).start;
  const endISO = dayRange(tomorrow).end;

  // NU se preia niciodată dincolo de mâine.
  const lessons = await getInstructorLessonsRange(s.id, startISO, endISO).catch(() => []);

  const todayLessons = lessons.filter((l) => isSameDay(parseISO(l.start_time), today));
  const tomorrowLessons = lessons.filter((l) => !isSameDay(parseISO(l.start_time), today));

  const sections: { key: string; label: string; icon: IconName; items: typeof lessons }[] = [
    { key: "today", label: d.today.todayLabel, icon: "clock", items: todayLessons },
    { key: "tomorrow", label: d.today.tomorrowLabel, icon: "calendar", items: tomorrowLessons },
  ];

  return (
    <div className="space-y-5">
      <h1 className="page-title">{d.today.title}</h1>

      {sections.map((sec) => (
        <section key={sec.key} className="space-y-3">
          <div className="flex items-center gap-2 text-slate-700">
            <Icon name={sec.icon} size={18} />
            <h2 className="section-title">{sec.label}</h2>
            {sec.items.length > 0 && (
              <span className="ml-auto inline-flex items-center justify-center rounded-full bg-brand-50 px-2 py-0.5 text-xs font-bold text-brand">
                {sec.items.length}
              </span>
            )}
          </div>

          {sec.items.length === 0 ? (
            <div className="card text-center text-sm text-slate-400">{d.today.empty}</div>
          ) : (
            <div className="space-y-2.5">
              {sec.items.map((l) => (
                <LessonCard
                  key={l.id}
                  lesson={l}
                  showActions
                  allowPayment
                  studentHref={"/instructor/students/" + l.student?.id}
                />
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
