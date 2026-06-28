import { requireInstructor } from "@/lib/auth/session";
import { getDict } from "@/lib/i18n/dictionaries";
import { getAdminClient } from "@/lib/supabase/admin";
import { StudentSearch } from "./StudentSearch";
import type { Student } from "@/lib/db/types";

export const dynamic = "force-dynamic";

export default async function InstructorStudentsPage() {
  const s = await requireInstructor();
  const d = getDict(s.language_pref);

  // Cursanții atribuiți acestui instructor (oricare fază), dedublați după id.
  const supabase = getAdminClient();
  const { data } = await supabase
    .from("student_instructors")
    .select("student:students(*)")
    .eq("instructor_id", s.id);

  const byId = new Map<string, Student>();
  for (const row of (data as unknown as { student: Student | null }[]) ?? []) {
    const st = row.student;
    if (st && !byId.has(st.id)) byId.set(st.id, st);
  }
  const students = [...byId.values()]
    .sort((a, b) => `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`))
    .map((st) => ({
      id: st.id,
      first_name: st.first_name,
      last_name: st.last_name,
      transmission: st.transmission,
    }));

  return (
    <div className="space-y-4">
      <h1 className="page-title">{d.students.title}</h1>
      <StudentSearch students={students} />
    </div>
  );
}
