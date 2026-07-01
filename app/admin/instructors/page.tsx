import { requireAdmin } from "@/lib/auth/session";
import { getAllInstructors, getAllCars, getAllOperators } from "@/lib/db/queries";
import { InstructorsClient, type InstructorRow, type CarRow, type OperatorRow } from "./InstructorsClient";

export const dynamic = "force-dynamic";

export default async function AdminInstructorsPage() {
  await requireAdmin();

  const [instructors, cars, operators] = await Promise.all([
    getAllInstructors(),
    getAllCars(),
    getAllOperators(),
  ]);

  const instructorRows: InstructorRow[] = instructors.map((i) => ({
    id: i.id,
    full_name: i.full_name,
    phone: i.phone,
    language_pref: i.language_pref,
    assigned_car_id: i.assigned_car_id,
    operator_id: i.operator_id,
    active: i.active,
    work_start: i.work_start,
    work_end: i.work_end,
  }));

  const carRows: CarRow[] = cars.map((c) => ({
    id: c.id,
    model: c.model,
    plate: c.plate,
  }));

  const operatorRows: OperatorRow[] = operators
    .filter((o) => o.active)
    .map((o) => ({ id: o.id, name: o.full_name }));

  return <InstructorsClient instructors={instructorRows} cars={carRows} operators={operatorRows} />;
}
