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
