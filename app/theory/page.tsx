import Link from "next/link";
import { requireTheory } from "@/lib/auth/session";
import { getDict, fmt } from "@/lib/i18n/dictionaries";
import { getGroupsForTheoryTeacher } from "@/lib/db/queries";
import { Icon } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function TheoryHomePage() {
  const s = await requireTheory();
  const d = getDict(s.language_pref);
  const groups = await getGroupsForTheoryTeacher(s.id);

  return (
    <div className="space-y-4">
      <h1 className="page-title">{d.theory.myGroups}</h1>

      {groups.length === 0 ? (
        <div className="card text-center py-10">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-3">
            <Icon name="users" size={24} />
          </span>
          <p className="text-sm text-slate-500">{d.theory.noGroups}</p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {groups.map((g) => (
            <li key={g.id}>
              <Link href={"/theory/group/" + g.id} className="card flex items-center gap-3 hover:border-brand/40">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand">
                  <Icon name="users" size={20} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900 truncate">{g.name}</p>
                  <p className="text-sm text-slate-500">{fmt(d.groups.studentsCount, { n: g.studentCount })}</p>
                </div>
                {g.archived && (
                  <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
                    {d.filters.archived}
                  </span>
                )}
                <Icon name="next" size={20} className="text-slate-300" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
