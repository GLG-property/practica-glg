import { requireAdmin } from "@/lib/auth/session";
import { getDict } from "@/lib/i18n/dictionaries";
import { getAllExaminers } from "@/lib/db/queries";
import { StaffClient, type StaffLite } from "../staff/StaffClient";

export const dynamic = "force-dynamic";

export default async function AdminExaminersPage() {
  const s = await requireAdmin();
  const d = getDict(s.language_pref);
  const users = await getAllExaminers();

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
      role="examiner"
      title={d.nav.examiners}
      addLabel={d.common.add}
      icon="award"
    />
  );
}
