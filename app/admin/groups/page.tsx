import { requireAdmin } from "@/lib/auth/session";
import { getAllGroups } from "@/lib/db/queries";
import { GroupsClient } from "./GroupsClient";

export const dynamic = "force-dynamic";

export default async function AdminGroupsPage() {
  await requireAdmin();
  const groups = await getAllGroups();
  return <GroupsClient groups={groups} />;
}
