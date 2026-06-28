# GLG Property — Aplicație de management pentru școala auto

Aplicație web (PWA) pentru școala auto **GLG Property**, cu **3 roluri** (administrator,
operatori, instructori), grupe de cursanți, atribuire de instructori pe **2 faze**, programare
făcută de operatori, plată urmărită **în ore** și reconciliere de încasări.

Stack: **Next.js 15 (App Router, TypeScript)**, **Supabase (Postgres + Storage)**,
**Tailwind CSS**, **zod**, autentificare prin **cod numeric**, bilingv **RO + RU**.

---

## Roluri și flux

- **Administrator** (cod 8 cifre): gestionează mașini, instructori, operatori; creează **grupe**
  și **cursanți**; atribuie fiecărui cursant **2 instructori** (faza 1 + faza 2); apasă
  **„Trimite la operatori"**; vede reconcilierea plăților, rapoarte și audit.
- **Operatori** (cod 5 cifre, 4 conturi): primesc cursanții repartizați și **programează**
  lecțiile pe calendarele instructorilor (UX simplu, cu prevenirea conflictelor).
- **Instructori** (cod 5 cifre): văd **doar programul de azi și mâine**, marchează lecția
  (efectuat / nu s-a prezentat / anulat), marchează **plata cash** la lecțiile neachitate și
  scriu remarci pe profilul cursantului.

### Mașini și faze
- **Mecanic:** 12 lecții pe mașina de început (ex. Skoda Fabia) → apoi 12 pe Skoda Scala (mecanic).
- **Automat:** 12 lecții pe mașina de început (ex. Toyota) → apoi 12 pe Skoda Scala (automat).
- **Faza 2 e blocată** până la 12 lecții efectuate în faza 1 (adminul poate forța excepții).
- Fiecare mașină are `transmission` (manual/automat) și `stage` (început/avansat); instructorul
  are o mașină atribuită, deci atribuirea unui instructor determină mașina + faza.

### Plata (în ore)
- O lecție durează implicit **1.5 ore**. Cursantul are `paid_hours` (ore achitate la casă).
- Lecțiile consumă ore în ordine; cât timp sunt acoperite de orele plătite sunt **verzi (achitat)**.
- Prima lecție peste orele plătite e **roșie (neachitat)**. Instructorul poate încasa cash și o
  marchează „achitat" — aceste încasări apar la admin în **reconciliere** (cash de adus la sfârșit de săptămână).

---

## Instalare

```bash
npm install
cp .env.example .env.local   # completează valorile (vezi mai jos)
```

> ⚠️ Nu pune chei reale în `.env.example` (e urmărit de git). Cheile reale doar în `.env.local`.

### Variabile de mediu (vezi `.env.example`)
| Variabilă | Rol |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL proiect Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | cheia publică anon |
| `SUPABASE_SERVICE_ROLE_KEY` | cheia service_role — **doar pe server** |
| `SESSION_SECRET` | secret cookie de sesiune (min. 16 caractere) |
| `NOTIFICATIONS_ENABLED` | `on` pentru notificări reale, altfel rămân in-app |
| `TELEGRAM_BOT_TOKEN`, `VIBER_BOT_TOKEN` | tokeni boți (opțional) |
| `CRON_SECRET` | protejează `/api/cron/reminders` |

Generează secretele cu `openssl rand -base64 48`.

---

## Bază de date (migrații + seed)

Rulează în **Supabase → SQL Editor**, în ordine:
1. `supabase/migrations/0001_init.sql`
2. `supabase/migrations/0002_rls.sql`
3. `supabase/migrations/0003_storage.sql`
4. `supabase/seed.sql` (date demo — opțional)

> ⚠️ Migrațiile + seed-ul **resetează** tabelele (truncate). Codurile demo sunt criptate bcrypt
> direct în SQL (pgcrypto), compatibil cu verificarea din aplicație.

---

## Rulare

```bash
npm run dev      # http://localhost:3000
npm run build
npm run start
npm run typecheck
```

La login: alegi rolul (Instructor / Operator / Admin) → tastezi codul pe tastatura numerică.
Sesiunea e **persistentă ~60 zile** (nu te re-loghezi zilnic).

### Conturi demo (după `seed.sql`)
| Rol | Cont | Cod |
|---|---|---|
| Admin | Administrator GLG | `12345678` |
| Operator | Operator Unu…Patru | `50001` / `50002` / `50003` / `50004` |
| Instructor | Ion Popescu (Fabia, mecanic) | `10001` |
| Instructor | Vasile Coju (Scala, mecanic) | `10002` |
| Instructor | Mihai Dumitru (Fabia, mecanic) | `10003` |
| Instructor | Sergei Volkov (Toyota, automat) | `10004` |
| Instructor | Dmitri Ivanov (Scala, automat) | `10005` |
| Instructor | Elena Smirnova (Toyota, automat) | `10006` |

Seed-ul include „Grupa A" (în lucru, de testat fluxul de atribuire + trimitere) și „Grupa B"
(deja trimisă, cu lecții azi/mâine, ca instructorii și operatorii să aibă date).

---

## Notificări (opțional)
Reminder cu o zi înainte de lecție către cursant (Telegram/Viber, dacă e legat; altfel in-app).
Setarea webhook-urilor și a cron-ului `/api/cron/reminders` e descrisă în `.env.example` și în cod.
Cursantul se leagă cu un cod de 6 cifre afișat pe profilul lui în aplicație.

---

## Securitate
- Coduri criptate bcrypt; niciodată în clar. Blocare după 5 încercări greșite (15 min, per dispozitiv).
- Sesiune cookie httpOnly/secure/sameSite, JWT semnat (HS256).
- Cheia `service_role` doar pe server (`import "server-only"`). RLS activ pe toate tabelele.
- Validare zod la toate Server Actions. Audit log pentru acțiuni sensibile.
- Control de acces pe rol (middleware + verificări în fiecare Server Action). Operatorii văd doar
  cursanții lor; instructorii doar lecțiile lor și doar azi+mâine.

## GDPR
Datele cursanților (nume, telefon, eventual identificatori de mesagerie) se folosesc doar pentru
programarea lecțiilor. Obține consimțământ înainte de a trimite remindere; permite ștergerea la
cerere (ștergerea unui cursant șterge în cascadă lecțiile și atribuirile asociate).

---

## Decizii de proiectare
- Autentificare fără email/parolă, pe bază de cod; tot accesul la date trece prin Server Actions /
  Route Handlers care verifică rolul și identitatea pe server.
- RLS restrictiv ca strat suplimentar (serverul folosește `service_role`, care ocolește RLS;
  browserul cu cheia `anon` e blocat complet).
- Conflictele de programare sunt impuse în două straturi: verificare prietenoasă în aplicație +
  constrângeri `EXCLUDE` (btree_gist) în Postgres.
- Plata se calculează din ore (`lib/payments.ts`), nu se stochează ca status fix, ca să rămână
  corectă când se modifică orele plătite.
- Export PDF: numele rusești și diacriticele românești sunt transliterate în ASCII (fonturile PDF
  standard suportă doar Latin-1); exportul Excel păstrează textul complet.
