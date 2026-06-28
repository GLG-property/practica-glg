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
