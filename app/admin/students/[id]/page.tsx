import { notFound } from "next/navigation";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { getDict } from "@/lib/i18n/dictionaries";
import { getStudentProfile } from "@/lib/db/queries";
import { StudentProfileView } from "@/components/StudentProfileView";
import { Icon } from "@/components/icons";
import { PaidHoursClient } from "./PaidHoursClient";
import { Phase2UnlockClient } from "./Phase2UnlockClient";

export const dynamic = "force-dynamic";

export default async function AdminStudentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const s = await requireAdmin();
  const d = getDict(s.language_pref);
  const { id } = await params;
  const profile = await getStudentProfile(id);
  if (!profile) notFound();

  return (
    <div className="space-y-3">
      <Link href="/admin/students" className="btn-ghost px-2 w-fit">
        <Icon name="back" size={20} /> {d.nav.students}
      </Link>
      <PaidHoursClient studentId={id} current={profile.student.paid_hours} />
      <Phase2UnlockClient studentId={id} unlocked={profile.student.phase2_unlocked} />
      <StudentProfileView profile={profile} lang={s.language_pref} canAddRemark />
    </div>
  );
}
