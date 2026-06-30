import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOperator } from "@/lib/auth/session";
import { getDict, fmt } from "@/lib/i18n/dictionaries";
import { getStudentProfile } from "@/lib/db/queries";
import { getAdminClient } from "@/lib/supabase/admin";
import { Icon } from "@/components/icons";
import { studentName } from "@/lib/db/types";
import { ScheduleClient, type ScheduleAssignment } from "./ScheduleClient";

export const dynamic = "force-dynamic";

export default async function OperatorSchedulePage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;
  const s = await requireOperator();
  const d = getDict(s.language_pref);

  // Verifică faptul că elevul este atribuit acestui operator.
  const supabase = getAdminClient();
  const { data: oa } = await supabase
    .from("operator_assignments")
    .select("id")
    .eq("operator_id", s.id)
    .eq("student_id", studentId)
    .maybeSingle();
  if (!oa) notFound();

  const profile = await getStudentProfile(studentId);
  if (!profile) notFound();

  const name = studentName(profile.student);

  // Programul de lucru al instructorilor (pentru sloturile de 1.5h).
  const instructorIds = [...new Set(profile.assignments.map((a) => a.instructor_id))];
  const { data: workRows } = await supabase
    .from("users")
    .select("id, work_start, work_end")
    .in("id", instructorIds.length ? instructorIds : ["00000000-0000-0000-0000-000000000000"]);
  const workMap = new Map<string, { start: string; end: string }>();
  for (const w of (workRows as { id: string; work_start: string; work_end: string }[]) ?? []) {
    workMap.set(w.id, { start: (w.work_start ?? "08:00").slice(0, 5), end: (w.work_end ?? "18:00").slice(0, 5) });
  }

  const assignments: ScheduleAssignment[] = profile.assignments.map((a) => ({
    id: a.id,
    phase: a.phase,
    booked: a.booked, // lecții programate (scheduled + completed)
    completed: a.completed, // lecții efectuate
    requiredLessons: a.required_lessons,
    instructorId: a.instructor_id,
    instructorName: a.instructor?.full_name ?? "—",
    carLabel: a.car ? a.car.model + " (" + a.car.plate + ")" : null,
    workStart: workMap.get(a.instructor_id)?.start ?? "08:00",
    workEnd: workMap.get(a.instructor_id)?.end ?? "18:00",
  }));

  const now = new Date();
  const defaultDate =
    now.getFullYear() +
    "-" +
    String(now.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(now.getDate()).padStart(2, "0");

  return (
    <div className="space-y-4">
      <div>
        <Link
          href="/operator"
          className="inline-flex items-center gap-1 text-sm font-medium text-brand mb-2"
        >
          <Icon name="back" size={16} /> {d.common.back}
        </Link>
        <h1 className="page-title">{fmt(d.operators.scheduleFor, { name })}</h1>
      </div>

      <ScheduleClient
        assignments={assignments}
        studentLabel={name}
        defaultDate={defaultDate}
        phase2Unlocked={profile.student.phase2_unlocked}
      />
    </div>
  );
}
