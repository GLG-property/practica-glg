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
