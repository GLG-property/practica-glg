import { requireAdmin } from "@/lib/auth/session";
import { getAdminStudents } from "@/lib/db/queries";
import { StudentsListClient } from "./StudentsListClient";

export const dynamic = "force-dynamic";

export default async function AdminStudentsPage() {
  await requireAdmin();
  const students = await getAdminStudents();
  return <StudentsListClient students={students} />;
}
