import { requireAdmin } from "@/lib/auth/session";
import { getAllStudents } from "@/lib/db/queries";
import { StudentsListClient } from "./StudentsListClient";

export const dynamic = "force-dynamic";

export default async function AdminStudentsPage() {
  await requireAdmin();
  const students = await getAllStudents();
  return <StudentsListClient students={students} />;
}
