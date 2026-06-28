// Tipuri TypeScript care reflectă schema bazei de date (arhitectura cu 3 roluri).

export type UserRole = "admin" | "operator" | "instructor";
export type Transmission = "manual" | "automatic";
export type CarStage = "beginner" | "advanced";
export type LessonStatus = "scheduled" | "completed" | "no_show" | "cancelled";
export type GroupStatus = "draft" | "sent";
export type NotificationChannel = "telegram" | "viber" | "inapp";
export type NotificationStatus = "pending" | "sent" | "failed";
export type LangPref = "ro" | "ru";

// Stare de plată calculată (nu se stochează direct).
export type PaymentState = "paid_cashier" | "paid_instructor" | "unpaid";

/** Categoria de permis: B = auto, C = camion, D = autobuz, A = moto. */
export type CarCategory = "B" | "C" | "D" | "A";

export interface Car {
  id: string;
  plate: string;
  model: string;
  transmission: Transmission;
  stage: CarStage;
  category: CarCategory;
  notes: string | null;
  itp_expiry: string | null;
  insurance_expiry: string | null;
  service_due: string | null;
  active: boolean;
  created_at: string;
}

export interface User {
  id: string;
  role: UserRole;
  full_name: string;
  code_hash: string;
  phone: string | null;
  photo_url: string | null;
  language_pref: LangPref;
  assigned_car_id: string | null;
  active: boolean;
  failed_attempts: number;
  locked_until: string | null;
  /** Program de lucru (HH:MM:SS) — folosit la generarea sloturilor de programare. */
  work_start: string;
  work_end: string;
  created_at: string;
}

export interface Group {
  id: string;
  name: string;
  theory_teacher: string | null;
  status: GroupStatus;
  created_by: string | null;
  sent_at: string | null;
  created_at: string;
}

export interface Student {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  transmission: Transmission;
  group_id: string | null;
  theory_teacher: string | null;
  notes: string | null;
  paid_hours: number;
  photo_url: string | null;
  telegram_chat_id: string | null;
  viber_id: string | null;
  link_code: string | null;
  created_by: string | null;
  created_at: string;
}

export interface StudentInstructor {
  id: string;
  student_id: string;
  instructor_id: string;
  car_id: string | null;
  phase: 1 | 2;
  required_lessons: number;
  created_at: string;
}

export interface OperatorAssignment {
  id: string;
  student_id: string;
  operator_id: string;
  assigned_at: string;
}

export interface Lesson {
  id: string;
  student_id: string;
  instructor_id: string;
  car_id: string | null;
  assignment_id: string | null;
  operator_id: string | null;
  phase: 1 | 2;
  start_time: string;
  end_time: string;
  duration_hours: number;
  status: LessonStatus;
  payment_by_instructor: boolean;
  payment_marked_by: string | null;
  payment_marked_at: string | null;
  remarks: string | null;
  screenshot_url: string | null;
  created_by_user_id: string | null;
  created_at: string;
}

export interface StudentRemark {
  id: string;
  student_id: string;
  lesson_id: string | null;
  author_id: string | null;
  text: string;
  screenshot_url: string | null;
  created_at: string;
}

export interface NotificationRow {
  id: string;
  lesson_id: string | null;
  channel: NotificationChannel;
  recipient: string | null;
  status: NotificationStatus;
  body: string | null;
  scheduled_for: string | null;
  sent_at: string | null;
  created_at: string;
}

export interface AuditLogRow {
  id: string;
  user_id: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

// ----- Tipuri îmbogățite (cu join-uri) pentru UI -----
export type StudentLite = Pick<
  Student,
  "id" | "first_name" | "last_name" | "phone" | "transmission" | "photo_url"
>;

export interface LessonWithRelations extends Lesson {
  student?: StudentLite | null;
  instructor?: Pick<User, "id" | "full_name"> | null;
  car?: Pick<Car, "id" | "plate" | "model" | "transmission" | "stage"> | null;
  /** Starea de plată calculată (umplută în queries/payments). */
  payment_state?: PaymentState;
}

export interface SessionUser {
  id: string;
  full_name: string;
  role: UserRole;
  language_pref: LangPref;
  assigned_car_id: string | null;
}

/** Numele complet al unui elev (helper). */
export function studentName(s: { first_name: string; last_name: string }): string {
  return `${s.last_name} ${s.first_name}`.trim();
}
