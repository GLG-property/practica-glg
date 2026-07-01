-- ============================================================
--  GLG Property — Migrație 0010: instructor -> operator care îl gestionează
-- ============================================================
--  Fiecare instructor are un operator care îi ține graficul (mei / toți).
--  NEDISTRUCTIV.
-- ============================================================

alter table public.users
  add column if not exists operator_id uuid references public.users(id) on delete set null;
create index if not exists idx_users_operator on public.users (operator_id);
