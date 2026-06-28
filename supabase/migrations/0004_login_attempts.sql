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
