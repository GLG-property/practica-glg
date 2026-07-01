-- GLG Property — ACTUALIZARE pentru baza EXISTENTĂ (nu șterge date)
-- Rulează o singură dată. Dacă apare eroarea 'ALTER TYPE ... cannot be run inside a
-- transaction block', rulează întâi separat cele două linii ALTER TYPE din 0009, apoi restul.

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

