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
