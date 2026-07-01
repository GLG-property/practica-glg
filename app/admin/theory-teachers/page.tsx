import { requireAdmin } from "@/lib/auth/session";
import { getDict } from "@/lib/i18n/dictionaries";
import { getAllTheoryTeachers } from "@/lib/db/queries";
import { StaffClient, type StaffLite } from "../staff/StaffClient";

export const dynamic = "force-dynamic";

export default async function AdminTheoryTeachersPage() {
  const s = await requireAdmin();
  const d = getDict(s.language_pref);
  const users = await getAllTheoryTeachers();

  const lite: StaffLite[] = users.map((u) => ({
    id: u.id,
    full_name: u.full_name,
    phone: u.phone,
    language_pref: u.language_pref,
    active: u.active,
  }));

  return (
    <StaffClient
      staff={lite}
      role="theory"
      title={d.nav.theoryTeachers}
      addLabel={d.common.add}
      icon="teacher"
    />
  );
}
