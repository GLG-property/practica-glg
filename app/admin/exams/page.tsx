import { requireAdmin } from "@/lib/auth/session";
import { getAllStudents, getAllExaminers, getExamsForAdmin } from "@/lib/db/queries";
import { studentName } from "@/lib/db/types";
import { ExamsClient, type ExamLite, type StudentOpt, type ExaminerOpt } from "./ExamsClient";

export const dynamic = "force-dynamic";

export default async function AdminExamsPage() {
  await requireAdmin();

  const [students, examiners, exams] = await Promise.all([
    getAllStudents(),
    getAllExaminers(),
    getExamsForAdmin(),
  ]);

  const studentOpts: StudentOpt[] = students.map((s) => ({ id: s.id, name: studentName(s) }));
  const examinerOpts: ExaminerOpt[] = examiners
    .filter((e) => e.active)
    .map((e) => ({ id: e.id, name: e.full_name }));
  const examRows: ExamLite[] = exams.map((e) => ({
    id: e.id,
    studentName: e.studentName,
    examinerName: e.examinerName,
    scheduled_at: e.scheduled_at,
    result: e.result,
    mention: e.mention,
  }));

  return <ExamsClient students={studentOpts} examiners={examinerOpts} exams={examRows} />;
}
