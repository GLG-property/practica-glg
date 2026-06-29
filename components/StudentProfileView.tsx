import { getDict, fmt } from "@/lib/i18n/dictionaries";
import { StatusBadge } from "@/components/StatusBadge";
import { PaymentBadge } from "@/components/PaymentBadge";
import { RemarkForm } from "@/components/RemarkForm";
import { LinkBotButton } from "@/components/LinkBotButton";
import { Icon } from "@/components/icons";
import { dateTime } from "@/lib/utils/date";
import { studentName, type LangPref } from "@/lib/db/types";
import type { StudentProfile } from "@/lib/db/queries";

export function StudentProfileView({
  profile,
  lang,
  canAddRemark = true,
}: {
  profile: StudentProfile;
  lang: LangPref;
  canAddRemark?: boolean;
}) {
  const d = getDict(lang);
  const { student, group, assignments, lessons, remarks, noShowCount } = profile;
  const linked = !!(student.telegram_chat_id || student.viber_id);
  const name = studentName(student);
  const initials = `${student.last_name[0] ?? ""}${student.first_name[0] ?? ""}`.toUpperCase();
  const payLabels = {
    paid: d.payment.paid, unpaid: d.payment.unpaid,
    paidCashier: d.payment.paidCashier, paidInstructor: d.payment.paidInstructor,
  };

  return (
    <div className="space-y-3">
      {/* Antet */}
      <div className="card">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand font-bold">{initials}</span>
          <div>
            <h2 className="text-lg font-bold text-slate-900">{name}</h2>
            <p className="text-sm text-slate-500">
              {student.transmission === "manual" ? d.students.manual : d.students.automatic}
              {group ? ` · ${group.name}` : ""}
            </p>
          </div>
        </div>

        {(student.theory_teacher || group?.theory_teacher) && (
          <p className="mt-2 text-sm text-slate-500">
            {d.students.theoryTeacher}: {student.theory_teacher || group?.theory_teacher}
          </p>
        )}

        {student.phone && (
          <div className="mt-3 flex gap-2">
            <a href={`tel:${student.phone}`} className="btn-secondary flex-1"><Icon name="phone" size={15} /> {d.today.call}</a>
            <a href={`sms:${student.phone}`} className="btn-secondary flex-1"><Icon name="message" size={15} /> {d.today.sms}</a>
          </div>
        )}

        {/* Ore plătite + neprezentări */}
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          <div className="rounded-xl bg-slate-50 p-3 text-center">
            <p className="text-2xl font-bold text-brand">{student.paid_hours}</p>
            <p className="text-xs text-slate-500 mt-0.5">{d.payment.paidHours}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 text-center">
            <p className="text-2xl font-bold text-status-noshow">{noShowCount}</p>
            <p className="text-xs text-slate-500 mt-0.5">{fmt(d.students.noShowCount, { n: noShowCount })}</p>
          </div>
        </div>

        <div className="mt-3">
          <LinkBotButton studentId={student.id} existingCode={student.link_code} linked={linked} />
        </div>
      </div>

      {/* Atribuiri instructori + progres faze */}
      <div className="card">
        <h3 className="section-title mb-2.5">{d.students.instructors}</h3>
        {assignments.length === 0 ? (
          <p className="text-sm text-slate-400">{d.common.noData}</p>
        ) : (
          <ul className="space-y-2.5">
            {assignments.map((a) => {
              const pct = Math.min(100, Math.round((a.booked / a.required_lessons) * 100));
              return (
                <li key={a.id} className="rounded-xl border border-slate-100 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold rounded bg-slate-100 px-1.5 py-0.5">
                      {a.phase === 1 ? d.students.phase1 : d.students.phase2}
                    </span>
                    <span className="text-sm font-semibold text-slate-700">
                      {a.booked}/{a.required_lessons}
                      <span className="ml-1 font-normal text-slate-400">· {a.completed} efectuate</span>
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm font-medium text-slate-900">
                    {a.instructor?.full_name ?? "—"}
                    {a.car ? <span className="text-slate-500 font-normal"> · {a.car.model} ({a.car.plate})</span> : null}
                  </p>
                  <div className="mt-2 h-2 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-brand" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Remarci */}
      {canAddRemark && (
        <div className="card">
          <h3 className="section-title mb-2.5">{d.students.addRemark}</h3>
          <RemarkForm studentId={student.id} />
        </div>
      )}
      {remarks.length > 0 && (
        <div className="card">
          <h3 className="section-title mb-2.5">{d.students.remarks}</h3>
          <ul className="space-y-3">
            {remarks.map((r) => (
              <li key={r.id} className="border-l-2 border-slate-200 pl-3">
                <p className="text-sm text-slate-700">{r.text}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {dateTime(r.created_at)}{r.author?.full_name ? ` · ${r.author.full_name}` : ""}
                </p>
                {r.screenshot_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.screenshot_url} alt="screenshot" className="mt-2 max-h-44 rounded-lg border" />
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Istoric lecții */}
      <div className="card">
        <h3 className="section-title mb-2.5 flex items-center gap-2"><Icon name="history" size={16} /> {d.students.history}</h3>
        {lessons.length === 0 ? (
          <p className="text-sm text-slate-400">{d.common.noData}</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {lessons.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-2 py-2.5">
                <span className="min-w-0 truncate text-sm text-slate-600">
                  {dateTime(l.start_time)} · {d.lesson.phase} {l.phase}
                </span>
                <div className="flex shrink-0 items-center gap-1.5">
                  <PaymentBadge state={l.payment_state} labels={payLabels} />
                  <StatusBadge status={l.status} label={d.status[l.status]} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
