import { requireOperator } from "@/lib/auth/session";
import { getDict } from "@/lib/i18n/dictionaries";
import { getStudentsWithAssignments } from "@/lib/db/queries";
import { getAdminClient } from "@/lib/supabase/admin";
import { studentName } from "@/lib/db/types";
import { daysUntil, ageFromBirth } from "@/lib/utils/date";
import { OperatorStudentsClient, type OperatorStudentRow } from "./OperatorStudentsClient";

export const dynamic = "force-dynamic";

export default async function OperatorHomePage() {
  const s = await requireOperator();
  const d = getDict(s.language_pref);
  const students = await getStudentsWithAssignments({ operatorId: s.id });

  // Grupele cursanților → nume + zile rămase (informația „galbenă").
  const groupIds = [...new Set(students.map((st) => st.group_id).filter(Boolean) as string[])];
  const groupMap = new Map<string, { name: string; end_date: string | null }>();
  if (groupIds.length) {
    const supabase = getAdminClient();
    const { data: groups } = await supabase.from("groups").select("id, name, end_date").in("id", groupIds);
    for (const g of (groups as { id: string; name: string; end_date: string | null }[]) ?? []) {
      groupMap.set(g.id, { name: g.name, end_date: g.end_date });
    }
  }

  const rows: OperatorStudentRow[] = students.map((st) => {
    const grp = st.group_id ? groupMap.get(st.group_id) : null;
    return {
      id: st.id,
      name: studentName(st),
      transmission: st.transmission,
      groupName: grp?.name ?? null,
      daysLeft: grp?.end_date ? daysUntil(grp.end_date) : null,
      age: ageFromBirth(st.birth_date),
      assignments: st.assignments.map((a) => ({
        phase: a.phase,
        booked: a.booked,
        requiredLessons: a.required_lessons,
        instructorName: a.instructor?.full_name ?? "—",
        carLabel: a.car ? a.car.model + " (" + a.car.plate + ")" : null,
      })),
    };
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="page-title">{d.operators.myStudents}</h1>
        {rows.length > 0 && (
          <span className="rounded-full bg-brand-50 text-brand text-xs font-semibold px-2.5 py-1">
            {rows.length}
          </span>
        )}
      </div>
      <OperatorStudentsClient students={rows} />
    </div>
  );
}
