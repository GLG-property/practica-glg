-- ============================================================
--  GLG Property — Migrație 0008: deblocare manuală faza 2 per cursant
-- ============================================================
--  Unii cursanți fac doar Scala (faza 2) sau nu au faza 1 obligatorie.
--  Adminul poate debloca manual faza 2 pentru un cursant.
--  NEDISTRUCTIV: doar adaugă o coloană.
-- ============================================================

alter table public.students
  add column if not exists phase2_unlocked boolean not null default false;
