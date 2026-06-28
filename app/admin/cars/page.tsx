import { requireAdmin } from "@/lib/auth/session";
import { getAllCars, getAllInstructors } from "@/lib/db/queries";
import { CarsClient, type InstructorLite } from "./CarsClient";

export const dynamic = "force-dynamic";

export default async function AdminCarsPage() {
  await requireAdmin();
  const [cars, instructors] = await Promise.all([getAllCars(), getAllInstructors()]);
  const instructorLites: InstructorLite[] = instructors.map((i) => ({
    id: i.id,
    full_name: i.full_name,
    assigned_car_id: i.assigned_car_id,
    active: i.active,
  }));
  return <CarsClient cars={cars} instructors={instructorLites} />;
}
