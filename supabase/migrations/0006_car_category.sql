-- ============================================================
--  GLG Property — Migrație 0006: categorie permis pentru mașini
-- ============================================================
--  B = autoturisme (Fabia/Scala/Toyota — fluxul cu 2 faze).
--  C = camion, D = autobuz, A = motocicletă (alte categorii; nu intră în fluxul B).
--  NEDISTRUCTIV: doar adaugă o coloană cu valoare implicită 'B'.
-- ============================================================

alter table public.cars
  add column if not exists category text not null default 'B';
