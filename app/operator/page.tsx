import Link from "next/link";
import { requireOperator } from "@/lib/auth/session";
import { getDict } from "@/lib/i18n/dictionaries";
import { getStudentsWithAssignments } from "@/lib/db/queries";
import { Icon } from "@/components/icons";
import { studentName } from "@/lib/db/types";

export const dynamic = "force-dynamic";

export default async function OperatorHomePage() {
  const s = await requireOperator();
  const d = getDict(s.language_pref);
  const students = await getStudentsWithAssignments({ operatorId: s.id });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="page-title">{d.operators.myStudents}</h1>
        {students.length > 0 && (
          <span className="rounded-full bg-brand-50 text-brand text-xs font-semibold px-2.5 py-1">
            {students.length}
          </span>
        )}
      </div>

      {students.length === 0 ? (
        <div className="card text-center py-10">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-3">
            <Icon name="users" size={24} />
          </span>
          <p className="text-sm text-slate-500">{d.operators.empty}</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {students.map((student) => {
            const name = studentName(student);
            return (
              <li key={student.id} className="card">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold text-slate-900 truncate">{name}</h2>
                    <p className="text-sm text-slate-500">
                      {student.transmission === "manual" ? d.students.manual : d.students.automatic}
                    </p>
                  </div>
                  <Link
                    href={"/operator/students/" + student.id}
                    className="btn-ghost h-9 px-2 text-xs shrink-0"
                  >
                    {d.common.open}
                  </Link>
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {student.assignments.length === 0 ? (
                    <p className="text-sm text-slate-400">{d.common.noData}</p>
                  ) : (
                    student.assignments.map((a) => (
                      <div key={a.id} className="rounded-xl border border-slate-100 p-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold rounded bg-slate-100 px-1.5 py-0.5">
                            {a.phase === 1 ? d.students.phase1 : d.students.phase2}
                          </span>
                          <span className="text-sm font-semibold text-slate-700 tabular-nums">
                            {a.booked}/{a.required_lessons}
                          </span>
                        </div>
                        <p className="mt-1 text-sm font-medium text-slate-900 truncate">
                          {a.instructor?.full_name ?? "—"}
                        </p>
                        {a.car && (
                          <p className="text-xs text-slate-500 truncate">
                            {a.car.model} ({a.car.plate})
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>

                <Link
                  href={"/operator/schedule/" + student.id}
                  className="btn-primary w-full mt-3"
                >
                  <Icon name="plus" size={16} /> {d.nav.schedule}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
