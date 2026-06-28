-- ============================================================
--  GLG Property — Migrație 0001: schema (arhitectura cu 3 roluri)
--  Roluri: admin, operator, instructor.
--  Flux: admin face grupe + elevi, atribuie 2 instructori (faza 1 + faza 2),
--        trimite la operatori; operatorii programează pe calendarele instructorilor;
--        instructorii văd doar azi+mâine și marchează status + plata.
-- ============================================================

create extension if not exists "pgcrypto";
create extension if not exists "btree_gist";

-- ---------- RESET (înlocuiește complet orice schemă veche) ----------
-- Necesar fiindcă versiunea anterioară avea alte coloane/tipuri (ex. lessons.driver_id,
-- rolul „driver"). Fără asta, `create table if not exists` păstrează tabelele vechi și
-- constrângerile noi eșuează (ex: column "instructor_id" does not exist).
-- ATENȚIE: șterge toate datele existente.
drop table if exists
  public.audit_log, public.notifications, public.student_remarks, public.lessons,
  public.operator_assignments, public.student_instructors, public.students,
  public.groups, public.login_attempts, public.users, public.cars
  cascade;

drop type if exists
  user_role, transmission, car_stage, lesson_status, group_status,
  notification_channel, notification_status, lang_pref
  cascade;

-- ---------- Tipuri enumerate ----------
do $$ begin create type user_role as enum ('admin','operator','instructor'); exception when duplicate_object then null; end $$;
do $$ begin create type transmission as enum ('manual','automatic'); exception when duplicate_object then null; end $$;
do $$ begin create type car_stage as enum ('beginner','advanced'); exception when duplicate_object then null; end $$;
do $$ begin create type lesson_status as enum ('scheduled','completed','no_show','cancelled'); exception when duplicate_object then null; end $$;
do $$ begin create type group_status as enum ('draft','sent'); exception when duplicate_object then null; end $$;
do $$ begin create type notification_channel as enum ('telegram','viber','inapp'); exception when duplicate_object then null; end $$;
do $$ begin create type notification_status as enum ('pending','sent','failed'); exception when duplicate_object then null; end $$;
do $$ begin create type lang_pref as enum ('ro','ru'); exception when duplicate_object then null; end $$;

-- ---------- Mașini ----------
-- transmission = manual/automatic; stage = beginner (Fabia/Toyota) / advanced (Scala).
create table if not exists public.cars (
  id               uuid primary key default gen_random_uuid(),
  plate            text not null,
  model            text not null,
  transmission     transmission not null,
  stage            car_stage not null,
  notes            text,
  itp_expiry       date,
  insurance_expiry date,
  service_due      date,
  active           boolean not null default true,
  created_at       timestamptz not null default now()
);

-- ---------- Utilizatori (admin / operator / instructor) ----------
-- Login pe COD numeric (hash bcrypt). Instructorul are mașina lui atribuită.
create table if not exists public.users (
  id              uuid primary key default gen_random_uuid(),
  role            user_role not null,
  full_name       text not null,
  code_hash       text not null,                 -- bcrypt al codului numeric, NICIODATĂ în clar
  phone           text,
  photo_url       text,
  language_pref   lang_pref not null default 'ro',
  assigned_car_id uuid references public.cars(id) on delete set null,
  active          boolean not null default true,
  failed_attempts int not null default 0,
  locked_until    timestamptz,
  created_at      timestamptz not null default now()
);

-- ---------- Grupe ----------
create table if not exists public.groups (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  theory_teacher text,                            -- profesor teoretic implicit pe grupă
  status         group_status not null default 'draft',
  created_by     uuid references public.users(id) on delete set null,
  sent_at        timestamptz,
  created_at     timestamptz not null default now()
);

-- ---------- Elevi (cursanți) ----------
-- Introduși de admin. Plata se ține în ORE (paid_hours = ore achitate la casă).
create table if not exists public.students (
  id               uuid primary key default gen_random_uuid(),
  first_name       text not null,                 -- prenume
  last_name        text not null,                 -- nume
  phone            text,
  transmission     transmission not null,         -- mecanic / automat
  group_id         uuid references public.groups(id) on delete set null,
  theory_teacher   text,
  notes            text,
  paid_hours       numeric(6,1) not null default 0,  -- ore achitate la casă (prepaid)
  photo_url        text,
  telegram_chat_id text,
  viber_id         text,
  link_code        text,
  created_by       uuid references public.users(id) on delete set null,
  created_at       timestamptz not null default now()
);

-- ---------- Atribuiri instructor (2 per elev: faza 1 + faza 2) ----------
-- phase 1 = mașina de început (beginner), phase 2 = Scala (advanced).
create table if not exists public.student_instructors (
  id              uuid primary key default gen_random_uuid(),
  student_id      uuid not null references public.students(id) on delete cascade,
  instructor_id   uuid not null references public.users(id) on delete cascade,
  car_id          uuid references public.cars(id) on delete set null,
  phase           int not null check (phase in (1,2)),
  required_lessons int not null default 12,
  created_at      timestamptz not null default now(),
  unique (student_id, phase)
);

-- ---------- Repartizare la operatori (1 operator per elev) ----------
create table if not exists public.operator_assignments (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references public.students(id) on delete cascade unique,
  operator_id uuid not null references public.users(id) on delete cascade,
  assigned_at timestamptz not null default now()
);

-- ---------- Lecții (programări) ----------
-- payment_by_instructor = plată cash marcată de instructor (override).
-- Acoperirea „la casă" se calculează din ore (paid_hours) în aplicație.
create table if not exists public.lessons (
  id                    uuid primary key default gen_random_uuid(),
  student_id            uuid not null references public.students(id) on delete cascade,
  instructor_id         uuid not null references public.users(id) on delete cascade,
  car_id                uuid references public.cars(id) on delete set null,
  assignment_id         uuid references public.student_instructors(id) on delete set null,
  operator_id           uuid references public.users(id) on delete set null,  -- cine a programat
  phase                 int not null default 1 check (phase in (1,2)),
  start_time            timestamptz not null,
  end_time              timestamptz not null,
  duration_hours        numeric(4,1) not null default 1.5,
  status                lesson_status not null default 'scheduled',
  payment_by_instructor boolean not null default false,
  payment_marked_by     uuid references public.users(id) on delete set null,
  payment_marked_at     timestamptz,
  remarks               text,
  screenshot_url        text,
  created_by_user_id    uuid references public.users(id) on delete set null,
  created_at            timestamptz not null default now(),
  constraint lessons_time_valid check (end_time > start_time)
);

-- Conflicte la nivel de DB (plasă de siguranță, pe lângă verificarea din aplicație).
alter table public.lessons drop constraint if exists lessons_no_instructor_overlap;
alter table public.lessons add constraint lessons_no_instructor_overlap
  exclude using gist (instructor_id with =, tstzrange(start_time, end_time) with &&)
  where (status in ('scheduled','completed'));

alter table public.lessons drop constraint if exists lessons_no_car_overlap;
alter table public.lessons add constraint lessons_no_car_overlap
  exclude using gist (car_id with =, tstzrange(start_time, end_time) with &&)
  where (status in ('scheduled','completed') and car_id is not null);

-- ---------- Remarci pe elev ----------
create table if not exists public.student_remarks (
  id             uuid primary key default gen_random_uuid(),
  student_id     uuid not null references public.students(id) on delete cascade,
  lesson_id      uuid references public.lessons(id) on delete set null,
  author_id      uuid references public.users(id) on delete set null,
  text           text not null,
  screenshot_url text,
  created_at     timestamptz not null default now()
);

-- ---------- Notificări ----------
create table if not exists public.notifications (
  id            uuid primary key default gen_random_uuid(),
  lesson_id     uuid references public.lessons(id) on delete cascade,
  channel       notification_channel not null,
  recipient     text,
  status        notification_status not null default 'pending',
  body          text,
  scheduled_for timestamptz,
  sent_at       timestamptz,
  created_at    timestamptz not null default now()
);

-- ---------- Audit ----------
create table if not exists public.audit_log (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.users(id) on delete set null,
  action     text not null,
  entity     text not null,
  entity_id  uuid,
  details    jsonb,
  created_at timestamptz not null default now()
);

-- ---------- Indecși ----------
create index if not exists idx_users_role            on public.users (role) where active;
create index if not exists idx_lessons_instr_start   on public.lessons (instructor_id, start_time);
create index if not exists idx_lessons_student       on public.lessons (student_id, start_time);
create index if not exists idx_lessons_car_start     on public.lessons (car_id, start_time);
create index if not exists idx_lessons_start         on public.lessons (start_time);
create index if not exists idx_students_group        on public.students (group_id);
create index if not exists idx_si_student            on public.student_instructors (student_id);
create index if not exists idx_si_instructor         on public.student_instructors (instructor_id);
create index if not exists idx_opassign_operator     on public.operator_assignments (operator_id);
create index if not exists idx_remarks_student       on public.student_remarks (student_id, created_at desc);
create index if not exists idx_notifications_status  on public.notifications (status, scheduled_for);
create index if not exists idx_audit_created         on public.audit_log (created_at desc);
