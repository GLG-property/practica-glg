import Link from "next/link";
import { notFound } from "next/navigation";
import { requireInstructor } from "@/lib/auth/session";
import { getDict } from "@/lib/i18n/dictionaries";
import { getStudentProfile } from "@/lib/db/queries";
import { StudentProfileView } from "@/components/StudentProfileView";
import { Icon } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function InstructorStudentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const s = await requireInstructor();
  const d = getDict(s.language_pref);
  const { id } = await params;

  const profile = await getStudentProfile(id);
  if (!profile) notFound();

  // Instructorul vede doar cursanții care îi sunt atribuiți.
  if (!profile.assignments.some((a) => a.instructor_id === s.id)) notFound();

  // În istoric, instructorul vede DOAR lecțiile lui cu acest cursant (nu și faza celuilalt instructor).
  const scoped = { ...profile, lessons: profile.lessons.filter((l) => l.instructor_id === s.id) };

  return (
    <div className="space-y-3">
      <Link
        href="/instructor/students"
        className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-brand"
      >
        <Icon name="back" size={16} /> {d.common.back}
      </Link>
      <StudentProfileView profile={scoped} lang={s.language_pref} canAddRemark />
    </div>
  );
}
