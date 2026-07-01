import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTheory } from "@/lib/auth/session";
import { getDict } from "@/lib/i18n/dictionaries";
import { getTheoryGroupDetail } from "@/lib/db/queries";
import { todayYmd } from "@/lib/utils/date";
import { Icon } from "@/components/icons";
import { AttendanceClient } from "./AttendanceClient";

export const dynamic = "force-dynamic";

export default async function TheoryGroupPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const s = await requireTheory();
  const d = getDict(s.language_pref);
  const { id } = await params;
  const { date } = await searchParams;
  const selectedDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : todayYmd();

  const detail = await getTheoryGroupDetail(id, s.id, selectedDate);
  if (!detail) notFound();

  return (
    <div className="space-y-4">
      <Link href="/theory" className="btn-ghost px-2 w-fit">
        <Icon name="back" size={20} /> {d.theory.myGroups}
      </Link>
      <h1 className="page-title">{detail.group.name}</h1>
      <AttendanceClient groupId={id} date={selectedDate} students={detail.students} />
    </div>
  );
}
