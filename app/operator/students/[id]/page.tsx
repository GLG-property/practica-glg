import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOperator } from "@/lib/auth/session";
import { getDict } from "@/lib/i18n/dictionaries";
import { getStudentProfile } from "@/lib/db/queries";
import { getAdminClient } from "@/lib/supabase/admin";
import { StudentProfileView } from "@/components/StudentProfileView";
import { Icon } from "@/components/icons";
import { PaidHoursForm } from "./PaidHoursForm";

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

      <StudentProfileView profile={profile} lang={s.language_pref} canAddRemark={false} />
    </div>
  );
}
