import { requireAdmin } from "@/lib/auth/session";
import { getAllGroups, getAllTheoryTeachers } from "@/lib/db/queries";
import { GroupsClient, type TeacherOpt } from "./GroupsClient";

export const dynamic = "force-dynamic";

export default async function AdminGroupsPage() {
  await requireAdmin();
  const [groups, teachers] = await Promise.all([getAllGroups(), getAllTheoryTeachers()]);
  const teacherOpts: TeacherOpt[] = teachers
    .filter((t) => t.active)
    .map((t) => ({ id: t.id, name: t.full_name }));
  return <GroupsClient groups={groups} teachers={teacherOpts} />;
}
