import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { getGroupById, getStudentsWithAssignments, getAllOperators } from "@/lib/db/queries";
import { getAdminClient } from "@/lib/supabase/admin";
import type { CarStage, Transmission } from "@/lib/db/types";
import {
  GroupDetailClient,
  type GroupInfo,
  type StudentRow,
  type OperatorOption,
  type InstructorOption,
} from "./GroupDetailClient";

export const dynamic = "force-dynamic";

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const group = await getGroupById(id);
  if (!group) notFound();

  const [students, operators] = await Promise.all([
    getStudentsWithAssignments({ groupId: id }),
    getAllOperators(),
  ]);

  // Instructori activi împreună cu mașina lor (etapă + cutie) pentru filtrarea pe faze.
  const supabase = getAdminClient();
  const { data: instrData } = await supabase
    .from("users")
    .select("id, full_name, car:cars!users_assigned_car_id_fkey(transmission, stage, plate, model, category)")
    .eq("role", "instructor")
    .eq("active", true)
    .order("full_name");

  const instructors: InstructorOption[] = ((instrData as any[]) ?? [])
    .map((u) => {
      const car = Array.isArray(u.car) ? u.car[0] : u.car;
      // Doar instructorii de categoria B intră în fluxul cu 2 faze (auto).
      if (!car || car.category !== "B") return null;
      return {
        id: u.id as string,
        full_name: u.full_name as string,
        transmission: car.transmission as Transmission,
        stage: car.stage as CarStage,
        plate: (car.plate as string | null) ?? null,
        model: (car.model as string | null) ?? null,
      };
    })
    .filter((x): x is InstructorOption => x !== null);

  const groupInfo: GroupInfo = {
    id: group.id,
    name: group.name,
    theory_teacher: group.theory_teacher,
    status: group.status,
  };

  const studentRows: StudentRow[] = students.map((s) => ({
    id: s.id,
    first_name: s.first_name,
    last_name: s.last_name,
    transmission: s.transmission,
    assignments: (s.assignments ?? []).map((a) => ({
      phase: a.phase,
      instructor_id: a.instructor_id,
    })),
  }));

  const operatorOptions: OperatorOption[] = operators.map((o) => ({
    id: o.id,
    full_name: o.full_name,
  }));

  return (
    <GroupDetailClient
      group={groupInfo}
      students={studentRows}
      operators={operatorOptions}
      instructors={instructors}
    />
  );
}
