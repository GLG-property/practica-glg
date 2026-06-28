import { requireAdmin } from "@/lib/auth/session";
import { getAllOperators } from "@/lib/db/queries";
import { OperatorsClient, type OperatorLite } from "./OperatorsClient";

export const dynamic = "force-dynamic";

export default async function AdminOperatorsPage() {
  await requireAdmin();
  const operators = await getAllOperators();

  // Nu trimitem code_hash sau alte câmpuri sensibile în client.
  const lite: OperatorLite[] = operators.map((o) => ({
    id: o.id,
    full_name: o.full_name,
    phone: o.phone,
    language_pref: o.language_pref,
    active: o.active,
  }));

  return <OperatorsClient operators={lite} />;
}
