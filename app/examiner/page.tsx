import { requireExaminer } from "@/lib/auth/session";
import { getDict } from "@/lib/i18n/dictionaries";
import { getExamsForExaminer } from "@/lib/db/queries";
import { ExaminerClient, type ExaminerExam } from "./ExaminerClient";

export const dynamic = "force-dynamic";

export default async function ExaminerHomePage() {
  const s = await requireExaminer();
  const d = getDict(s.language_pref);
  const exams = await getExamsForExaminer(s.id);

  const rows: ExaminerExam[] = exams.map((e) => ({
    id: e.id,
    studentName: e.studentName,
    scheduled_at: e.scheduled_at,
    result: e.result,
    mention: e.mention,
  }));

  return (
    <div className="space-y-4">
      <h1 className="page-title">{d.nav.myExams}</h1>
      <ExaminerClient exams={rows} />
    </div>
  );
}
