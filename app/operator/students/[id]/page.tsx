import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOperator } from "@/lib/auth/session";
import { getDict } from "@/lib/i18n/dictionaries";
import { getStudentProfile } from "@/lib/db/queries";
import { getAdminClient } from "@/lib/supabase/admin";
import { StudentProfileView } from "@/components/StudentProfileView";
import { Icon } from "@/components/icons";
import { PaidHoursForm } from "./PaidHoursForm";
import { ReassignClient, type InstructorOpt, type PhaseAssign } from "./ReassignClient";

export const dynamic = "force-dynamic";

export default async function OperatorStudentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const s = await requireOperator();
  const d = getDict(s.language_pref);

  // Verifică faptul că elevul este atribuit acestui operator.
  const supabase = getAdminClient();
  const { data: oa } = await supabase
    .from("operator_assignments")
    .select("id")
    .eq("operator_id", s.id)
    .eq("student_id", id)
    .maybeSingle();
  if (!oa) notFound();

  const profile = await getStudentProfile(id);
  if (!profile) notFound();

  // Toți instructorii activi de categoria B (acces partajat pentru schimbări/concedii).
  const { data: instrData } = await supabase
    .from("users")
    .select("id, full_name, car:cars!users_assigned_car_id_fkey(model, plate, category)")
    .eq("role", "instructor")
    .eq("active", true)
    .order("full_name");
  const instructors: InstructorOpt[] = ((instrData as any[]) ?? [])
    .map((u) => {
      const car = Array.isArray(u.car) ? u.car[0] : u.car;
      if (!car || car.category !== "B") return null;
      const label = car.model ? u.full_name + " — " + car.model + (car.plate ? " (" + car.plate + ")" : "") : u.full_name;
      return { id: u.id as string, name: label };
    })
    .filter((x): x is InstructorOpt => x !== null);

  const phaseAssigns: PhaseAssign[] = profile.assignments.map((a) => ({
    phase: a.phase,
    instructorId: a.instructor_id,
  }));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Link
          href="/operator"
          className="inline-flex items-center gap-1 text-sm font-medium text-brand"
        >
          <Icon name="back" size={16} /> {d.common.back}
        </Link>
        <Link href={"/operator/schedule/" + id} className="btn-primary h-9 px-3 text-xs">
          <Icon name="plus" size={15} /> {d.nav.schedule}
        </Link>
      </div>

      <div className="card">
        <h3 className="section-title mb-2.5">{d.payment.setPaidHours}</h3>
        <PaidHoursForm studentId={id} current={profile.student.paid_hours} />
      </div>

      <ReassignClient studentId={id} assignments={phaseAssigns} instructors={instructors} />

      <StudentProfileView profile={profile} lang={s.language_pref} canAddRemark />
    </div>
  );
}
