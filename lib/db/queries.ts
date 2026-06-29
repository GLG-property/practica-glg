import "server-only";
import { getAdminClient } from "@/lib/supabase/admin";
import { computePaymentStates } from "@/lib/payments";
import { daysUntil, ageFromBirth, isGroupArchived } from "@/lib/utils/date";
import type {
  Car, Group, LessonWithRelations, PaymentState, Student, StudentInstructor,
  StudentRemark, User,
} from "@/lib/db/types";

const LESSON_SELECT =
  "*, student:students(id,first_name,last_name,phone,transmission,photo_url), instructor:users!lessons_instructor_id_fkey(id,full_name), car:cars(id,plate,model,transmission,stage)";

/** Atașează starea de plată calculată fiecărei lecții din listă. */
async function attachPaymentStates(lessons: LessonWithRelations[]): Promise<LessonWithRelations[]> {
  if (lessons.length === 0) return lessons;
  const supabase = getAdminClient();
  const studentIds = [...new Set(lessons.map((l) => l.student_id))];

  const { data: students } = await supabase
    .from("students")
    .select("id, paid_hours")
    .in("id", studentIds);
  const paidMap = new Map<string, number>(
    (students ?? []).map((s: any) => [s.id, Number(s.paid_hours) || 0])
  );

  const { data: allLessons } = await supabase
    .from("lessons")
    .select("id, student_id, start_time, status, duration_hours, payment_by_instructor")
    .in("student_id", studentIds);

  const byStudent = new Map<string, any[]>();
  for (const l of (allLessons as any[]) ?? []) {
    const arr = byStudent.get(l.student_id) ?? [];
    arr.push(l);
    byStudent.set(l.student_id, arr);
  }

  const stateById = new Map<string, PaymentState>();
  for (const [sid, ls] of byStudent) {
    const states = computePaymentStates(ls, paidMap.get(sid) ?? 0);
    states.forEach((v, k) => stateById.set(k, v));
  }

  for (const l of lessons) {
    l.payment_state = stateById.get(l.id) ?? "unpaid";
  }
  return lessons;
}

// ---------------- INSTRUCTOR ----------------

export async function getInstructorLessonsRange(
  instructorId: string,
  startISO: string,
  endISO: string
): Promise<LessonWithRelations[]> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("lessons")
    .select(LESSON_SELECT)
    .eq("instructor_id", instructorId)
    .gte("start_time", startISO)
    .lte("start_time", endISO)
    .order("start_time", { ascending: true });
  if (error) throw error;
  return attachPaymentStates((data as unknown as LessonWithRelations[]) ?? []);
}

// ---------------- CALENDAR (operator/admin) ----------------

export async function getLessonsRange(filters: {
  start: string;
  end: string;
  instructorId?: string;
  carId?: string;
  studentId?: string;
}): Promise<LessonWithRelations[]> {
  const supabase = getAdminClient();
  let q = supabase.from("lessons").select(LESSON_SELECT)
    .gte("start_time", filters.start).lte("start_time", filters.end);
  if (filters.instructorId) q = q.eq("instructor_id", filters.instructorId);
  if (filters.carId) q = q.eq("car_id", filters.carId);
  if (filters.studentId) q = q.eq("student_id", filters.studentId);
  const { data, error } = await q.order("start_time", { ascending: true });
  if (error) throw error;
  return attachPaymentStates((data as unknown as LessonWithRelations[]) ?? []);
}

// ---------------- STUDENT PROFILE ----------------

export interface StudentAssignment extends StudentInstructor {
  instructor?: Pick<User, "id" | "full_name"> | null;
  car?: Pick<Car, "id" | "plate" | "model" | "transmission" | "stage"> | null;
  /** Lecții efectuate (status completed) — folosit pentru gate-ul fazei 2. */
  completed: number;
  /** Lecții programate (scheduled + completed, fără anulate/neprezentate) — progresul de programare. */
  booked: number;
}

export interface StudentProfile {
  student: Student;
  group: Group | null;
  assignments: StudentAssignment[];
  lessons: LessonWithRelations[];
  remarks: (StudentRemark & { author?: { full_name: string } | null })[];
  noShowCount: number;
}

export async function getStudentProfile(studentId: string): Promise<StudentProfile | null> {
  const supabase = getAdminClient();

  const { data: student } = await supabase.from("students").select("*").eq("id", studentId).single();
  if (!student) return null;

  const [{ data: group }, { data: rawAssignments }, { data: lessons }, { data: remarks }] =
    await Promise.all([
      (student as Student).group_id
        ? supabase.from("groups").select("*").eq("id", (student as Student).group_id).single()
        : Promise.resolve({ data: null }),
      supabase
        .from("student_instructors")
        .select("*, instructor:users(id,full_name), car:cars(id,plate,model,transmission,stage)")
        .eq("student_id", studentId)
        .order("phase", { ascending: true }),
      supabase.from("lessons").select(LESSON_SELECT).eq("student_id", studentId).order("start_time", { ascending: false }),
      supabase.from("student_remarks").select("*, author:users(full_name)").eq("student_id", studentId).order("created_at", { ascending: false }),
    ]);

  const lessonsList = (lessons as unknown as LessonWithRelations[]) ?? [];
  await attachPaymentStates(lessonsList);

  // Lecții per fază: efectuate (gate) și programate (progres de programare).
  const completedByPhase: Record<number, number> = { 1: 0, 2: 0 };
  const bookedByPhase: Record<number, number> = { 1: 0, 2: 0 };
  for (const l of lessonsList) {
    if (l.status === "completed") completedByPhase[l.phase] = (completedByPhase[l.phase] ?? 0) + 1;
    if (l.status === "scheduled" || l.status === "completed")
      bookedByPhase[l.phase] = (bookedByPhase[l.phase] ?? 0) + 1;
  }

  const assignments: StudentAssignment[] = ((rawAssignments as any[]) ?? []).map((a) => ({
    ...a,
    completed: completedByPhase[a.phase] ?? 0,
    booked: bookedByPhase[a.phase] ?? 0,
  }));

  const noShowCount = lessonsList.filter((l) => l.status === "no_show").length;

  return {
    student: student as Student,
    group: (group as Group) ?? null,
    assignments,
    lessons: lessonsList,
    remarks: (remarks as never) ?? [],
    noShowCount,
  };
}

// ---------------- USERS / CARS ----------------

export async function getUserById(id: string): Promise<User | null> {
  const supabase = getAdminClient();
  const { data } = await supabase.from("users").select("*").eq("id", id).single();
  return (data as User) ?? null;
}

export async function getCarById(id: string | null): Promise<Car | null> {
  if (!id) return null;
  const supabase = getAdminClient();
  const { data } = await supabase.from("cars").select("*").eq("id", id).single();
  return (data as Car) ?? null;
}

export async function getUsersByRole(role: "admin" | "operator" | "instructor"): Promise<User[]> {
  const supabase = getAdminClient();
  const { data, error } = await supabase.from("users").select("*").eq("role", role).order("full_name");
  if (error) throw error;
  return (data as User[]) ?? [];
}

export const getAllInstructors = () => getUsersByRole("instructor");
export const getAllOperators = () => getUsersByRole("operator");

export async function getAllCars(): Promise<Car[]> {
  const supabase = getAdminClient();
  const { data, error } = await supabase.from("cars").select("*").order("plate");
  if (error) throw error;
  return (data as Car[]) ?? [];
}

// ---------------- GROUPS & STUDENTS ----------------

export type GroupRow = Group & {
  studentCount: number;
  daysLeft: number | null; // zile rămase până la end_date
  isArchived: boolean; // arhivată manual sau end_date trecut
};

export async function getAllGroups(): Promise<GroupRow[]> {
  const supabase = getAdminClient();
  const { data: groups } = await supabase.from("groups").select("*").order("created_at", { ascending: false });
  const { data: students } = await supabase.from("students").select("group_id");
  const counts = new Map<string, number>();
  for (const s of (students as any[]) ?? []) {
    if (s.group_id) counts.set(s.group_id, (counts.get(s.group_id) ?? 0) + 1);
  }
  return ((groups as Group[]) ?? []).map((g) => ({
    ...g,
    studentCount: counts.get(g.id) ?? 0,
    daysLeft: daysUntil(g.end_date),
    isArchived: isGroupArchived(g),
  }));
}

export interface AdminStudentRow extends Student {
  group_name: string | null;
  group_end_date: string | null;
  isArchived: boolean; // grupa lui e arhivată
  daysLeft: number | null; // zile rămase din perioada grupei
  age: number | null;
}

/** Lista de cursanți pentru admin: cu grupă, vârstă, zile rămase și status de arhivă. */
export async function getAdminStudents(): Promise<AdminStudentRow[]> {
  const supabase = getAdminClient();
  const { data } = await supabase
    .from("students")
    .select("*, group:groups(name, end_date, archived)")
    .order("last_name");
  return ((data as any[]) ?? []).map((row) => {
    const { group, ...s } = row;
    const g = Array.isArray(group) ? group[0] : group;
    return {
      ...(s as Student),
      group_name: g?.name ?? null,
      group_end_date: g?.end_date ?? null,
      isArchived: g ? isGroupArchived(g) : false,
      daysLeft: daysUntil(g?.end_date ?? null),
      age: ageFromBirth((s as Student).birth_date),
    };
  });
}

export async function getGroupById(id: string): Promise<Group | null> {
  const supabase = getAdminClient();
  const { data } = await supabase.from("groups").select("*").eq("id", id).single();
  return (data as Group) ?? null;
}

/** Elevii unei grupe, cu atribuirile lor (instructori + faze). */
export interface StudentWithAssignments extends Student {
  assignments: StudentAssignment[];
}

export async function getStudentsWithAssignments(filter: {
  groupId?: string;
  operatorId?: string;
}): Promise<StudentWithAssignments[]> {
  const supabase = getAdminClient();
  let sq = supabase.from("students").select("*");
  if (filter.groupId) sq = sq.eq("group_id", filter.groupId);
  if (filter.operatorId) {
    const { data: oa } = await supabase
      .from("operator_assignments")
      .select("student_id")
      .eq("operator_id", filter.operatorId);
    const ids = ((oa as any[]) ?? []).map((x) => x.student_id);
    if (ids.length === 0) return [];
    sq = sq.in("id", ids);
  }
  const { data: students } = await sq.order("last_name");
  const studentList = (students as Student[]) ?? [];
  if (studentList.length === 0) return [];

  const ids = studentList.map((s) => s.id);
  const [{ data: assignments }, { data: lessonRows }] = await Promise.all([
    supabase
      .from("student_instructors")
      .select("*, instructor:users(id,full_name), car:cars(id,plate,model,transmission,stage)")
      .in("student_id", ids)
      .order("phase"),
    supabase.from("lessons").select("student_id, phase, status").in("student_id", ids),
  ]);

  // Contoare per (elev, fază): efectuate + programate.
  const cnt = new Map<string, { completed: number; booked: number }>();
  for (const l of (lessonRows as { student_id: string; phase: number; status: string }[]) ?? []) {
    const key = `${l.student_id}:${l.phase}`;
    const c = cnt.get(key) ?? { completed: 0, booked: 0 };
    if (l.status === "completed") c.completed++;
    if (l.status === "scheduled" || l.status === "completed") c.booked++;
    cnt.set(key, c);
  }

  const byStudent = new Map<string, StudentAssignment[]>();
  for (const a of (assignments as any[]) ?? []) {
    const c = cnt.get(`${a.student_id}:${a.phase}`) ?? { completed: 0, booked: 0 };
    const arr = byStudent.get(a.student_id) ?? [];
    arr.push({ ...a, completed: c.completed, booked: c.booked });
    byStudent.set(a.student_id, arr);
  }
  return studentList.map((s) => ({ ...s, assignments: byStudent.get(s.id) ?? [] }));
}

export async function getAllStudents(search?: string): Promise<Student[]> {
  const supabase = getAdminClient();
  let q = supabase.from("students").select("*");
  if (search && search.trim()) {
    q = q.or(`first_name.ilike.%${search.trim()}%,last_name.ilike.%${search.trim()}%`);
  }
  const { data, error } = await q.order("last_name");
  if (error) throw error;
  return (data as Student[]) ?? [];
}

// ---------------- DASHBOARD & RECONCILIERE ----------------

export interface DashboardStats {
  studentsTotal: number;
  groupsTotal: number;
  lessonsToday: number;
  noShowRate: number;
  cashToCollect: number; // câte lecții achitate cash (neaduse)
  perInstructor: { name: string; count: number }[];
}

export async function getAdminDashboard(todayRange: { start: string; end: string }): Promise<DashboardStats> {
  const supabase = getAdminClient();
  // Toate interogările în PARALEL + lecțiile zilei „ușoare" (fără calcul de plată) = mult mai rapid.
  const [studentsRes, groupsRes, todayRes, cashRes] = await Promise.all([
    supabase.from("students").select("id", { count: "exact", head: true }),
    supabase.from("groups").select("id", { count: "exact", head: true }),
    supabase
      .from("lessons")
      .select("status, instructor:users!lessons_instructor_id_fkey(full_name)")
      .gte("start_time", todayRange.start)
      .lte("start_time", todayRange.end),
    supabase.from("lessons").select("id", { count: "exact", head: true }).eq("payment_by_instructor", true),
  ]);

  const studentsTotal = studentsRes.count;
  const groupsTotal = groupsRes.count;
  const cashCount = cashRes.count;
  const todayLessons = ((todayRes.data as any[]) ?? []) as {
    status: string;
    instructor: { full_name: string } | { full_name: string }[] | null;
  }[];

  const decided = todayLessons.filter((l) => l.status === "completed" || l.status === "no_show");
  const noShows = decided.filter((l) => l.status === "no_show").length;

  const perInstructorMap = new Map<string, number>();
  for (const l of todayLessons) {
    const instr = Array.isArray(l.instructor) ? l.instructor[0] : l.instructor;
    const n = instr?.full_name ?? "—";
    perInstructorMap.set(n, (perInstructorMap.get(n) ?? 0) + 1);
  }

  return {
    studentsTotal: studentsTotal ?? 0,
    groupsTotal: groupsTotal ?? 0,
    lessonsToday: todayLessons.length,
    noShowRate: decided.length ? Math.round((noShows / decided.length) * 100) : 0,
    cashToCollect: cashCount ?? 0,
    perInstructor: [...perInstructorMap.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
  };
}

/** Reconciliere: lecții achitate cash de instructori, grupate pe instructor. */
export interface ReconLine {
  instructorId: string;
  instructorName: string;
  count: number;
  lessons: LessonWithRelations[];
}

export async function getReconciliation(range: { start: string; end: string }): Promise<ReconLine[]> {
  const supabase = getAdminClient();
  const { data } = await supabase
    .from("lessons")
    .select(LESSON_SELECT)
    .eq("payment_by_instructor", true)
    // Excludem lecțiile anulate / neprezentate (nu reprezintă cash de adus).
    .in("status", ["scheduled", "completed"])
    .gte("payment_marked_at", range.start)
    .lte("payment_marked_at", range.end)
    .order("payment_marked_at", { ascending: true });

  const lessons = (data as unknown as LessonWithRelations[]) ?? [];
  const byInstr = new Map<string, ReconLine>();
  for (const l of lessons) {
    const id = l.instructor_id;
    const name = l.instructor?.full_name ?? "—";
    const line = byInstr.get(id) ?? { instructorId: id, instructorName: name, count: 0, lessons: [] };
    line.count++;
    line.lessons.push(l);
    byInstr.set(id, line);
  }
  return [...byInstr.values()].sort((a, b) => b.count - a.count);
}

// ---------------- AUDIT ----------------

export async function getAuditLog(limit = 200) {
  const supabase = getAdminClient();
  const { data } = await supabase
    .from("audit_log")
    .select("*, user:users(full_name)")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as never[]) ?? [];
}

// ---------------- NOTIFICĂRI IN-APP ----------------

export async function getUserNotifications(userId: string) {
  const supabase = getAdminClient();
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("channel", "inapp")
    .eq("recipient", userId)
    .order("created_at", { ascending: false })
    .limit(30);
  return data ?? [];
}
