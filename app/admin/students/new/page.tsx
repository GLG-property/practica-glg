import { requireAdmin } from "@/lib/auth/session";
import { getAllGroups } from "@/lib/db/queries";
import { NewStudentClient } from "./NewStudentClient";

export const dynamic = "force-dynamic";

export default async function NewStudentPage() {
  await requireAdmin();
  const groups = await getAllGroups();
  return <NewStudentClient groups={groups} />;
}
