import { requireAdmin } from "@/lib/auth/session";
import { getAllGroups } from "@/lib/db/queries";
import { GroupsClient, type GroupRow } from "./GroupsClient";

export const dynamic = "force-dynamic";

export default async function AdminGroupsPage() {
  await requireAdmin();

  const groups = await getAllGroups();
  const rows: GroupRow[] = groups.map((g) => ({
    id: g.id,
    name: g.name,
    status: g.status,
    studentCount: g.studentCount,
  }));

  return <GroupsClient groups={rows} />;
}
