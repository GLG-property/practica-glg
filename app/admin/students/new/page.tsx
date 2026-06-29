import { requireAdmin } from "@/lib/auth/session";
import { getAllGroups } from "@/lib/db/queries";
import { NewStudentClient } from "./NewStudentClient";

export const dynamic = "force-dynamic";

export default async function NewStudentPage() {
  await requireAdmin();
  // Doar grupele active — nu adăugăm cursanți în grupe arhivate.
  const groups = (await getAllGroups()).filter((g) => !g.isArchived);
  return <NewStudentClient groups={groups} />;
}
