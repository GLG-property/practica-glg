-- GLG Property — SETUP COMPLET (rulează DOAR pe o bază goală)

-- ###### 0001_init ######
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
do $$ begin create type user_role as enum ('admin','operator','instructor','theory','examiner'); exception when duplicate_object then null; end $$;
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

-- ###### 0002_rls ######
-- ============================================================
--  GLG Property — Migrație 0002: Row Level Security (RLS)
-- ============================================================
--  Model: aplicația NU folosește Supabase Auth. Tot accesul trece prin
--  Server Actions / Route Handlers care rulează cu `service_role` (ocolește RLS)
--  și aplică regulile de rol pe server. RLS e strat suplimentar: blochează complet
--  accesul direct din browser cu cheia `anon`.
-- ============================================================

alter table public.users                enable row level security;
alter table public.cars                 enable row level security;
alter table public.groups               enable row level security;
alter table public.students             enable row level security;
alter table public.student_instructors  enable row level security;
alter table public.operator_assignments enable row level security;
alter table public.lessons              enable row level security;
alter table public.student_remarks      enable row level security;
alter table public.notifications        enable row level security;
alter table public.audit_log            enable row level security;

alter table public.users                force row level security;
alter table public.cars                 force row level security;
alter table public.groups               force row level security;
alter table public.students             force row level security;
alter table public.student_instructors  force row level security;
alter table public.operator_assignments force row level security;
alter table public.lessons              force row level security;
alter table public.student_remarks      force row level security;
alter table public.notifications        force row level security;
alter table public.audit_log            force row level security;

-- Fără politici pentru anon/authenticated => acces refuzat implicit.
-- `service_role` (server-ul nostru) ocolește RLS și funcționează normal.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, authenticated;

-- ###### 0003_storage ######
-- ============================================================
--  GLG Property — Migrație 0003: Storage (poze + screenshot-uri)
-- ============================================================
-- Creăm două bucket-uri în Supabase Storage:
--   - `photos`      : poze de profil (șoferi, cursanți)
--   - `screenshots` : capturi atașate la lecții/remarci
--
-- Le facem publice pentru CITIRE (pozele se afișează în <img>), dar SCRIEREA
-- se face doar de pe server cu `service_role`. Astfel afișarea e simplă,
-- iar încărcarea rămâne controlată.

insert into storage.buckets (id, name, public)
values
  ('photos', 'photos', true),
  ('screenshots', 'screenshots', true)
on conflict (id) do nothing;

-- Permitem citire publică din aceste bucket-uri (linkuri directe către imagini).
do $$ begin
  create policy "public_read_photos"
    on storage.objects for select
    using (bucket_id in ('photos', 'screenshots'));
exception when duplicate_object then null; end $$;

-- Scrierea/ștergerea NU au politici pentru anon/authenticated => doar `service_role`
-- (de pe server) poate încărca fișiere.

-- ###### 0004_login_attempts ######
-- ============================================================
--  GLG Property — Migrație 0004: throttling server-side la login
-- ============================================================
--  Login-ul se face cu cod anonim (nu știm contul până la potrivire), deci
--  anti brute-force-ul trebuie ținut server-side, pe IP + rol (nu doar în cookie).
-- ============================================================

create table if not exists public.login_attempts (
  id           uuid primary key default gen_random_uuid(),
  ip           text not null,
  role         user_role not null,
  fail_count   int not null default 0,
  locked_until timestamptz,
  updated_at   timestamptz not null default now(),
  unique (ip, role)
);

create index if not exists idx_login_attempts_ip on public.login_attempts (ip, role);

alter table public.login_attempts enable row level security;
alter table public.login_attempts force row level security;
revoke all on public.login_attempts from anon, authenticated;

-- ###### 0005_work_hours ######
-- ============================================================
--  GLG Property — Migrație 0005: program de lucru per instructor
-- ============================================================
--  Fiecare instructor are un interval de lucru (ex. 08:00–15:00 sau 06:00–18:00).
--  Operatorul programează în sloturi de 1.5h în acest interval.
--  NEDISTRUCTIV: doar adaugă coloane cu valori implicite (nu șterge date).
-- ============================================================

alter table public.users
  add column if not exists work_start time not null default '08:00',
  add column if not exists work_end   time not null default '18:00';

-- ###### 0006_car_category ######
-- ============================================================
--  GLG Property — Migrație 0006: categorie permis pentru mașini
-- ============================================================
--  B = autoturisme (Fabia/Scala/Toyota — fluxul cu 2 faze).
--  C = camion, D = autobuz, A = motocicletă (alte categorii; nu intră în fluxul B).
--  NEDISTRUCTIV: doar adaugă o coloană cu valoare implicită 'B'.
-- ============================================================

alter table public.cars
  add column if not exists category text not null default 'B';

-- ###### 0007_group_period ######
-- ============================================================
--  GLG Property — Migrație 0007: perioadă grupă + arhivă + data nașterii
-- ============================================================
--  NEDISTRUCTIV: doar adaugă coloane.
--  - groups: perioada de desfășurare (start_date, end_date) + arhivare manuală.
--    O grupă e considerată ARHIVATĂ dacă `archived = true` SAU end_date a trecut.
--  - students: data nașterii (pentru vârstă + filtre).
-- ============================================================

alter table public.groups
  add column if not exists start_date date,
  add column if not exists end_date   date,
  add column if not exists archived   boolean not null default false;

alter table public.students
  add column if not exists birth_date date;

create index if not exists idx_groups_end_date on public.groups (end_date);

-- ###### 0008_phase2_unlock ######
-- ============================================================
--  GLG Property — Migrație 0008: deblocare manuală faza 2 per cursant
-- ============================================================
--  Unii cursanți fac doar Scala (faza 2) sau nu au faza 1 obligatorie.
--  Adminul poate debloca manual faza 2 pentru un cursant.
--  NEDISTRUCTIV: doar adaugă o coloană.
-- ============================================================

alter table public.students
  add column if not exists phase2_unlocked boolean not null default false;

-- ###### 0009_roles_exams ######
-- ============================================================
--  GLG Property — Migrație 0009: roluri noi + examene + absențe teorie
-- ============================================================
--  NEDISTRUCTIV. Adaugă:
--   - rolurile 'theory' (profesor teoretic) și 'examiner' (examinator practic)
--   - legătura grupă -> profesor teoretic (cont)
--   - tabela `exams` (examen practic intern: programare + rezultat admis/respins + mențiuni)
--   - tabela `theory_absences` (absențe marcate de profesorul teoretic)
--
--  NOTĂ: dacă Supabase dă eroarea „ALTER TYPE ... ADD VALUE cannot be run inside a
--  transaction block", rulează MAI ÎNTÂI separat doar cele două linii ALTER TYPE de mai jos,
--  apoi rulează restul fișierului.
-- ============================================================

-- 1) Roluri noi în enum-ul user_role (idempotent).
alter type user_role add value if not exists 'theory';
alter type user_role add value if not exists 'examiner';

-- 2) Grupă -> profesor teoretic (cont). Păstrăm și textul `theory_teacher` pentru afișare.
alter table public.groups
  add column if not exists theory_teacher_id uuid references public.users(id) on delete set null;
create index if not exists idx_groups_theory_teacher on public.groups (theory_teacher_id);

-- 3) Examene (examen practic intern).
create table if not exists public.exams (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid not null references public.students(id) on delete cascade,
  exam_type    text not null default 'practical_internal',
  scheduled_at timestamptz not null,
  examiner_id  uuid references public.users(id) on delete set null,
  result       text not null default 'pending' check (result in ('pending','admis','respins')),
  mention      text,
  result_at    timestamptz,
  result_by    uuid references public.users(id) on delete set null,
  created_by   uuid references public.users(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index if not exists idx_exams_examiner  on public.exams (examiner_id);
create index if not exists idx_exams_scheduled on public.exams (scheduled_at);
create index if not exists idx_exams_student   on public.exams (student_id);
create index if not exists idx_exams_result    on public.exams (result);

-- 4) Absențe la teorie (un rând = o absență a unui cursant într-o zi).
create table if not exists public.theory_absences (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  group_id   uuid references public.groups(id) on delete set null,
  date       date not null,
  marked_by  uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (student_id, date)
);
create index if not exists idx_theory_absences_group on public.theory_absences (group_id, date);
create index if not exists idx_theory_absences_student on public.theory_absences (student_id);

-- 5) RLS (backstop — accesul real e prin service_role pe server).
alter table public.exams           enable row level security;
alter table public.theory_absences enable row level security;

-- ###### 0010_operator_instructor ######
-- ============================================================
--  GLG Property — Migrație 0010: instructor -> operator care îl gestionează
-- ============================================================
--  Fiecare instructor are un operator care îi ține graficul (mei / toți).
--  NEDISTRUCTIV.
-- ============================================================

alter table public.users
  add column if not exists operator_id uuid references public.users(id) on delete set null;
create index if not exists idx_users_operator on public.users (operator_id);

-- ###### SEED ######
-- ============================================================
--  GLG Property — Seed REAL (toate vehiculele + instructorii)
-- ============================================================
--  Admin (8 cifre):  12345678
--  Operatori (5 cifre): Cristina 50001 · Svetlana 50002 · Lilia 50003 · Catalina 50005
--  Instructori: coduri 10001..10050 (vezi supabase/INSTRUCTORI_CODURI.txt)
--  Categorii: B = auto (Fabia/Toyota = faza 1; Scala = faza 2), C = camion, D = autobuz, A = moto.
--  Cutie: secția "Cutia automată" = automată (Scala aut + Toyota); restul = mecanică.
-- ============================================================

truncate table public.audit_log, public.notifications, public.student_remarks,
               public.lessons, public.operator_assignments, public.student_instructors,
               public.students, public.groups, public.login_attempts, public.users, public.cars
  restart identity cascade;

-- ===== ADMIN + OPERATORI (id-uri fixe) =====
insert into public.users (id, role, full_name, code_hash, language_pref) values
  ('a0000000-0000-4000-8000-000000000001', 'admin',    'Administrator GLG', crypt('12345678', gen_salt('bf',8)), 'ro'),
  ('a0000000-0000-4000-8000-000000000011', 'operator', 'Cristina', crypt('50001', gen_salt('bf',8)), 'ro'),
  ('a0000000-0000-4000-8000-000000000012', 'operator', 'Svetlana', crypt('50002', gen_salt('bf',8)), 'ro'),
  ('a0000000-0000-4000-8000-000000000013', 'operator', 'Lilia',    crypt('50003', gen_salt('bf',8)), 'ro'),
  ('a0000000-0000-4000-8000-000000000014', 'operator', 'Catalina', crypt('50005', gen_salt('bf',8)), 'ro');

-- ===== MAȘINI (toate vehiculele) =====
insert into public.cars (plate, model, transmission, stage, category, notes) values
  ('YJX 090','Skoda Fabia','manual','beginner','B','Strășeni - Vorniceni'),
  ('YJX 104','Skoda Fabia','manual','beginner','B','Strășeni - Vorniceni'),
  ('WIW 461','Skoda Scala mec','manual','advanced','B','Strășeni - Vorniceni'),
  ('VLV 972','Skoda Scala mec','manual','advanced','B','Strășeni - Vorniceni'),
  ('VLV 761','Skoda Scala mec','manual','advanced','B','Strășeni - Vorniceni'),
  ('ZNQ 278','Skoda Scala mec','manual','advanced','B','Strășeni - Vorniceni'),
  ('GYM 375','Skoda Fabia','manual','beginner','B','Chișinău Buiucani'),
  ('KKE 553','Skoda Fabia','manual','beginner','B','Chișinău Buiucani'),
  ('HMK 714','Skoda Fabia','manual','beginner','B','Chișinău Buiucani'),
  ('MYX 522','Skoda Fabia','manual','beginner','B','Chișinău Buiucani'),
  ('KKE 570','Skoda Fabia','manual','beginner','B','Chișinău Buiucani'),
  ('TCC 733','Skoda Fabia','manual','beginner','B','Chișinău Buiucani'),
  ('HMK 685','Skoda Fabia','manual','beginner','B','Chișinău Buiucani'),
  ('MWC 307','Skoda Fabia','manual','beginner','B','Chișinău Buiucani'),
  ('MWC 296','Skoda Fabia','manual','beginner','B','Chișinău Buiucani'),
  ('DXC 775','Skoda Scala mec','manual','advanced','B','Chișinău Buiucani'),
  ('RCJ 609','Skoda Scala mec','manual','advanced','B','Chișinău Buiucani'),
  ('RCJ 623','Skoda Scala mec','manual','advanced','B','Chișinău Buiucani'),
  ('TNE 841','Skoda Scala mec','manual','advanced','B','Chișinău Buiucani'),
  ('ADK 809','Skoda Scala mec','manual','advanced','B','Chișinău Buiucani'),
  ('ALO 298','Skoda Scala mec','manual','advanced','B','Chișinău Buiucani'),
  ('EWE 087','Skoda Scala mec','manual','advanced','B','Chișinău Buiucani'),
  ('VLV 755','Skoda Scala mec','manual','advanced','B','Chișinău Buiucani'),
  ('TNE 876','Skoda Scala mec','manual','advanced','B','Chișinău Buiucani'),
  ('TTC 941','Skoda Scala mec','manual','advanced','B','Chișinău Buiucani'),
  ('TTC 862','Skoda Scala mec','manual','advanced','B','Chișinău Buiucani'),
  ('VKT 465','Skoda Fabia','manual','beginner','B','Chișinău Botanica'),
  ('LLC 590','Skoda Fabia','manual','beginner','B','Chișinău Botanica'),
  ('FHF 346','Skoda Fabia','manual','beginner','B','Chișinău Botanica'),
  ('LCX 135','Skoda Fabia','manual','beginner','B','Chișinău Botanica'),
  ('INL 763','Skoda Scala mec','manual','advanced','B','Chișinău Botanica'),
  ('YJX 088','Skoda Scala mec','manual','advanced','B','Chișinău Botanica'),
  ('LSL 861','Skoda Scala mec','manual','advanced','B','Chișinău Botanica'),
  ('ALO 246','Skoda Scala mec','manual','advanced','B','Chișinău Botanica'),
  ('LJN 646','Skoda Scala mec','manual','advanced','B','Chișinău Botanica'),
  ('HMK 690','Skoda Scala mec','manual','advanced','B','Chișinău Botanica'),
  ('ZNQ 295','Skoda Scala mec','manual','advanced','B','Chișinău Botanica'),
  ('OZD 123','Skoda Scala aut','automatic','advanced','B','Cutia automată'),
  ('HMK 712','Skoda Scala aut','automatic','advanced','B','Cutia automată'),
  ('KKE 533','Skoda Scala aut','automatic','advanced','B','Cutia automată'),
  ('TTC 896','Skoda Scala aut','automatic','advanced','B','Cutia automată'),
  ('QXX 178','Skoda Scala aut','automatic','advanced','B','Cutia automată'),
  ('TNE 863','Skoda Scala aut','automatic','advanced','B','Cutia automată'),
  ('TNE 896','Skoda Scala aut','automatic','advanced','B','Cutia automată'),
  ('JOB 381','Skoda Scala aut','automatic','advanced','B','Cutia automată'),
  ('JOB 395','Skoda Scala aut','automatic','advanced','B','Cutia automată'),
  ('LGX 989','Skoda Scala aut','automatic','advanced','B','Cutia automată'),
  ('FSD 430','Toyota Yaris','automatic','beginner','B','Cutia automată'),
  ('RPX 743','Toyota Yaris','automatic','beginner','B','Cutia automată'),
  ('TLT 609','Toyota Yaris','automatic','beginner','B','Cutia automată'),
  ('LGX 376','Toyota Yaris','automatic','beginner','B','Cutia automată'),
  ('OOT 710','Volvo FE 320','manual','beginner','C','Camion'),
  ('LGL 701','Volvo FL 290','manual','beginner','C','Camion'),
  ('YHM 119','Man 15 250','manual','beginner','C','Camion'),
  ('XMY 166','Irisbus','manual','beginner','D','Autobus'),
  ('023 ABC','Maya Motors A2','manual','beginner','A','Motocicletă'),
  ('632 GKH','Andes A2','manual','beginner','A','Motocicletă'),
  ('137 YXX','Andes A2','manual','beginner','A','Motocicletă'),
  ('953 XKS','CF Moto 650 A','manual','beginner','A','Motocicletă');

-- ===== INSTRUCTORI =====
insert into public.users (role, full_name, code_hash, phone, language_pref, assigned_car_id, work_start, work_end) values
  ('instructor','Cerescu Nicolai', crypt('10001', gen_salt('bf',8)), null, 'ro', (select id from public.cars where plate='YJX 090'), '06:00','19:30'),
  ('instructor','Cigolea Radu', crypt('10002', gen_salt('bf',8)), '069598113', 'ro', (select id from public.cars where plate='YJX 104'), '06:00','19:30'),
  ('instructor','Muntean Andrei', crypt('10003', gen_salt('bf',8)), '076072797', 'ro', (select id from public.cars where plate='WIW 461'), '06:00','19:30'),
  ('instructor','Ionașcu Mihail', crypt('10004', gen_salt('bf',8)), '069494109', 'ro', (select id from public.cars where plate='VLV 972'), '06:00','19:30'),
  ('instructor','Grosu Dimitrie', crypt('10005', gen_salt('bf',8)), '068960643', 'ro', (select id from public.cars where plate='VLV 761'), '06:00','19:30'),
  ('instructor','Iacobuța Constantin', crypt('10006', gen_salt('bf',8)), '061049944', 'ro', (select id from public.cars where plate='ZNQ 278'), '06:00','19:30'),
  ('instructor','Gînu Artur', crypt('10007', gen_salt('bf',8)), '068569823', 'ro', (select id from public.cars where plate='GYM 375'), '06:00','19:30'),
  ('instructor','Leahu Nicolae', crypt('10008', gen_salt('bf',8)), '079357771', 'ro', (select id from public.cars where plate='KKE 553'), '06:00','19:30'),
  ('instructor','Costin Iurie', crypt('10009', gen_salt('bf',8)), '079877686', 'ro', (select id from public.cars where plate='HMK 714'), '06:00','19:30'),
  ('instructor','Iftodi Alexandru', crypt('10010', gen_salt('bf',8)), '061013656', 'ro', (select id from public.cars where plate='MYX 522'), '06:00','19:30'),
  ('instructor','Bîrsa Vasile', crypt('10011', gen_salt('bf',8)), '069933998', 'ro', (select id from public.cars where plate='KKE 570'), '06:00','19:30'),
  ('instructor','Jalbă Maria', crypt('10012', gen_salt('bf',8)), '060244033', 'ro', (select id from public.cars where plate='TCC 733'), '06:00','19:30'),
  ('instructor','Istrati Ionela', crypt('10013', gen_salt('bf',8)), '079003869', 'ro', (select id from public.cars where plate='HMK 685'), '06:00','19:30'),
  ('instructor','Stețco Sergiu', crypt('10014', gen_salt('bf',8)), '069677900', 'ro', (select id from public.cars where plate='MWC 307'), '06:00','19:30'),
  ('instructor','Tatarlî Dumitru', crypt('10015', gen_salt('bf',8)), '079677703', 'ro', (select id from public.cars where plate='MWC 296'), '06:00','19:30'),
  ('instructor','Statiuc Igor', crypt('10016', gen_salt('bf',8)), '061147771', 'ro', (select id from public.cars where plate='DXC 775'), '06:00','19:30'),
  ('instructor','Brînză Eduard', crypt('10017', gen_salt('bf',8)), '079884393', 'ro', (select id from public.cars where plate='RCJ 609'), '06:00','19:30'),
  ('instructor','Mîță Nicolae', crypt('10018', gen_salt('bf',8)), '069019453', 'ro', (select id from public.cars where plate='RCJ 623'), '06:00','19:30'),
  ('instructor','Chifa Ion', crypt('10019', gen_salt('bf',8)), '079345072', 'ro', (select id from public.cars where plate='TNE 841'), '06:00','19:30'),
  ('instructor','Gheorghiev Sergiu', crypt('10020', gen_salt('bf',8)), '067249800', 'ro', (select id from public.cars where plate='ADK 809'), '06:00','19:30'),
  ('instructor','Burlacu Petru', crypt('10021', gen_salt('bf',8)), '068020875', 'ro', (select id from public.cars where plate='ALO 298'), '06:00','19:30'),
  ('instructor','Donea Igor', crypt('10022', gen_salt('bf',8)), '067391804', 'ro', (select id from public.cars where plate='EWE 087'), '06:00','19:30'),
  ('instructor','Tinco Vitalie', crypt('10023', gen_salt('bf',8)), '079585566', 'ro', (select id from public.cars where plate='VLV 755'), '06:00','19:30'),
  ('instructor','Brînză Victor', crypt('10024', gen_salt('bf',8)), '076847752', 'ro', (select id from public.cars where plate='TNE 876'), '06:00','19:30'),
  ('instructor','Diaconu Vasile', crypt('10025', gen_salt('bf',8)), '069590511', 'ro', (select id from public.cars where plate='VKT 465'), '06:00','19:30'),
  ('instructor','Adam Gheorghe', crypt('10026', gen_salt('bf',8)), '069492149', 'ro', (select id from public.cars where plate='LLC 590'), '06:00','19:30'),
  ('instructor','Grajdean Constantin', crypt('10027', gen_salt('bf',8)), '079561007', 'ro', (select id from public.cars where plate='FHF 346'), '06:00','19:30'),
  ('instructor','Donu Veaceslav', crypt('10028', gen_salt('bf',8)), '068533851', 'ro', (select id from public.cars where plate='LCX 135'), '06:00','19:30'),
  ('instructor','Leșan Andrei', crypt('10029', gen_salt('bf',8)), '069136081', 'ro', (select id from public.cars where plate='INL 763'), '06:00','19:30'),
  ('instructor','Negru Iurie', crypt('10030', gen_salt('bf',8)), '078253909', 'ro', (select id from public.cars where plate='YJX 088'), '06:00','19:30'),
  ('instructor','Cotovici Stanislav', crypt('10031', gen_salt('bf',8)), '069641025', 'ro', (select id from public.cars where plate='LSL 861'), '06:00','19:30'),
  ('instructor','Cebotari Sergiu', crypt('10032', gen_salt('bf',8)), '069288878', 'ro', (select id from public.cars where plate='ALO 246'), '06:00','19:30'),
  ('instructor','Matcovschi Veaceslav (tata)', crypt('10033', gen_salt('bf',8)), '068767693', 'ro', (select id from public.cars where plate='LJN 646'), '06:00','19:30'),
  ('instructor','Friptuleac Cristian', crypt('10034', gen_salt('bf',8)), '076847752', 'ro', (select id from public.cars where plate='HMK 690'), '06:00','19:30'),
  ('instructor','Iftodi Vladislav', crypt('10035', gen_salt('bf',8)), '068616020', 'ro', (select id from public.cars where plate='ZNQ 295'), '06:00','19:30'),
  ('instructor','Stegărescu Oleg', crypt('10036', gen_salt('bf',8)), '079425875', 'ro', (select id from public.cars where plate='OZD 123'), '06:00','19:30'),
  ('instructor','Matcovschi Veaceslav', crypt('10037', gen_salt('bf',8)), '078332999', 'ro', (select id from public.cars where plate='HMK 712'), '06:00','19:30'),
  ('instructor','Grigoriev Victor', crypt('10038', gen_salt('bf',8)), '069434477', 'ro', (select id from public.cars where plate='KKE 533'), '06:00','19:30'),
  ('instructor','Moraru Marcel', crypt('10039', gen_salt('bf',8)), '079903245', 'ro', (select id from public.cars where plate='TNE 863'), '06:00','19:30'),
  ('instructor','Catan Dorin', crypt('10040', gen_salt('bf',8)), '067679555', 'ro', (select id from public.cars where plate='TNE 896'), '06:00','19:30'),
  ('instructor','Focșa Vladimir', crypt('10041', gen_salt('bf',8)), '079512718', 'ro', (select id from public.cars where plate='JOB 381'), '06:00','19:30'),
  ('instructor','Gavriliță Victor', crypt('10042', gen_salt('bf',8)), '079517710', 'ro', (select id from public.cars where plate='JOB 395'), '06:00','19:30'),
  ('instructor','Munteanu Dumitru', crypt('10043', gen_salt('bf',8)), '060433383', 'ro', (select id from public.cars where plate='LGX 989'), '06:00','19:30'),
  ('instructor','Railean Nicolae', crypt('10044', gen_salt('bf',8)), '079199539', 'ro', (select id from public.cars where plate='FSD 430'), '06:00','19:30'),
  ('instructor','Curleac Anatolie', crypt('10045', gen_salt('bf',8)), '079777697', 'ro', (select id from public.cars where plate='RPX 743'), '06:00','19:30'),
  ('instructor','Zgherea Aurel', crypt('10046', gen_salt('bf',8)), '069041322', 'ro', (select id from public.cars where plate='TLT 609'), '06:00','19:30'),
  ('instructor','Jovmir Cristina', crypt('10047', gen_salt('bf',8)), '069381810', 'ro', (select id from public.cars where plate='LGX 376'), '06:00','19:30'),
  ('instructor','Stici Vasile', crypt('10048', gen_salt('bf',8)), '069132727', 'ro', (select id from public.cars where plate='OOT 710'), '06:00','19:30'),
  ('instructor','Scutelnic Mihail', crypt('10049', gen_salt('bf',8)), '078742294', 'ro', (select id from public.cars where plate='LGL 701'), '06:00','19:30'),
  ('instructor','Cebotari Vladimir', crypt('10050', gen_salt('bf',8)), '069479494', 'ro', (select id from public.cars where plate='023 ABC'), '06:00','19:30');

