# PROMPT pentru Claude Code — Aplicație de management pentru școala auto „GLG Property"

## Context și problemă
Construiește o aplicație web pentru școala auto **GLG Property**. Avem **60 de șoferi (instructori)** care fac în prezent toate programările cu cursanții pe hârtie. Vrem să digitalizăm complet acest proces.

Aplicația trebuie să fie **extrem de ușor de folosit atât de un șofer de 20 de ani, cât și de unul de 65–70 de ani**: fonturi mari, butoane mari, cât mai puține apăsări, totul intuitiv, fără jargon tehnic.

## Stack tehnic (obligatoriu)
- **Next.js** (App Router, TypeScript, Server Actions / Route Handlers pentru tot accesul la date).
- **Supabase** (Postgres + Storage pentru poze/screenshot-uri). Folosește migrații SQL.
- **Tailwind CSS** pentru UI. Componente simple, accesibile.
- **PWA** — instalabilă pe telefon ca aplicație reală (icon pe ecran), cu funcționare offline pentru citirea programului zilei.
- API-uri publice acolo unde e nevoie: **Telegram Bot API** și **Viber Bot API** pentru notificări către cursanți.
- Validare input cu **zod**.

> IMPORTANT: Construiește incremental, pe faze (vezi secțiunea „Ordinea de construcție"). După fiecare fază, asigură-te că aplicația rulează. Dacă o decizie e neclară, alege varianta cea mai simplă și sigură și noteaz-o în README. Pune cod curat, comentat în română unde ajută.

---

## Autentificare (model PIN)
- **Fără email/parolă.** Login pe bază de **PIN numeric**.
- Flux de login (simplu pentru orice vârstă): utilizatorul **își alege numele (și poza, dacă există) dintr-o listă → tastează PIN-ul** pe o tastatură numerică mare pe ecran.
  - **Șoferi:** PIN de **4 cifre**.
  - **Admini:** PIN de **8 cifre**.
- PIN-urile se stochează **criptat (hash bcrypt sau argon2)**, niciodată în clar.
- **Anti brute-force:** după **5 încercări greșite**, contul se blochează **15 minute** (`failed_attempts`, `locked_until`). Mesaj clar în RO/RU.
- Sesiune prin **cookie httpOnly securizat** (server-side). Cheia `service_role` a Supabase rămâne DOAR pe server, niciodată expusă în browser.

## Roluri și permisiuni
- Două roluri: **`admin`** și **`driver`**.
- **Tot accesul la baza de date trece prin Server Actions / Route Handlers** care verifică rolul și identitatea pe server.
- Activează **Row Level Security (RLS)** în Supabase ca strat suplimentar de apărare, cu politici restrictive:
  - **Șoferul vede DOAR** programările, cursanții și remarcile lui.
  - **Adminul vede tot.**
- Adaugă un **audit log** (cine, ce a modificat, când).

---

## Model de date (tabele Supabase)

**users** — id, full_name, role (`admin`|`driver`), pin_hash, phone, photo_url, language_pref (`ro`|`ru`), assigned_car_id (nullable), active (bool), failed_attempts (int), locked_until (timestamp), created_at.

**cars** — id, plate (număr înmatriculare), model, notes, itp_expiry (date), insurance_expiry (date), service_due (date, optional), active (bool).

**students** (cursanți) — id, full_name, phone, photo_url, created_by_driver_id, notes, package_total_hours (int, optional), package_used_hours (int, optional), telegram_chat_id (nullable), viber_id (nullable), created_at.

**lessons** (programări) — id, driver_id, student_id, car_id, start_time, end_time, status (`scheduled`|`completed`|`no_show`|`cancelled`), created_by_user_id, remarks (text, optional), screenshot_url (optional), created_at.

**student_remarks** (istoric remarci per cursant) — id, student_id, lesson_id (nullable), driver_id, text, screenshot_url (optional), created_at.

**notifications** — id, lesson_id, channel (`telegram`|`viber`|`inapp`), recipient, status (`pending`|`sent`|`failed`), scheduled_for, sent_at.

**audit_log** — id, user_id, action, entity, entity_id, details (jsonb), created_at.

Livrează schema ca **migrații SQL** + politicile RLS + un **script de seed** cu date demo realiste (1 admin, ~6 șoferi cu nume românești și rusești, câteva mașini cu numere de înmatriculare, ~15 cursanți, programări pe ziua curentă și săptămâna asta) — ca demo-ul să arate convingător.

---

## Funcționalități — ADMIN (PIN 8 cifre)
1. **Dashboard live + statistici:** lecții azi / săptămâna asta, rata de neprezentare, lecții per șofer, grad de folosire a mașinilor, cine are lecții acum.
2. **Gestionare șoferi:** adaugă / editează / dezactivează cont șofer, setează PIN-ul, **atribuie mașină**.
3. **Gestionare mașini:** CRUD + **alerte expirare ITP / asigurare / revizie** (badge roșu când se apropie scadența).
4. **Creează programări** pentru orice șofer.
5. **Vede TOATE programările** într-un calendar (vizualizare zi/săptămână), cu **filtrare** după șofer / mașină / dată.
6. **Vede toți cursanții** și istoricul lor.
7. **Export rapoarte** în Excel și PDF (lecții pe interval, per șofer, neprezentări).
8. **Vede audit log-ul.**

## Funcționalități — ȘOFER (PIN 4 cifre)
1. **Ecranul „Azi" ca pagină principală** — lecțiile de azi, mari și clare: nume cursant + oră + mașină. Zero meniuri ca să ajungi aici.
2. **Calendar** zi/săptămână cu programările proprii.
3. **Adaugă programare proprie:** alege cursantul din lista lui (cu **căutare rapidă**), alege intervalul, mașina se completează automat din cea atribuită. Programările adăugate de șofer **apar automat și la admin**.
4. **Adaugă cursant nou rapid:** nume + telefon, opțional poză. Cursantul se salvează în baza de date comună.
5. **Marchează lecția:** efectuată / **nu s-a prezentat** / anulată.
6. **Adaugă remarcă + screenshot opțional** la o lecție/cursant (ex. „programat dar nu s-a prezentat"). Remarcile rămân vizibile pentru lecțiile viitoare cu acel cursant.
7. **Profil cursant:** istoric complet al lecțiilor, **contor „nu s-a prezentat"** (ex. „a lipsit de 3 ori"), ore plătite vs. ore făcute.
8. **Apel / SMS cursant dintr-un singur tap** pe numărul lui.

---

## Detectare conflicte (obligatoriu)
La crearea oricărei programări, sistemul **blochează automat** suprapunerile:
- același șofer nu poate avea două lecții în același interval;
- aceeași mașină nu poate fi folosită de doi șoferi simultan.
Mesaj clar către utilizator când apare conflictul.

## Notificări către cursanți (Telegram + Viber)
- **Reminder automat cu o zi înainte** de lecție, trimis cursantului prin **bot Telegram** și/sau **bot Viber**.
- Cursantul se conectează simplu: pornește botul și trimite un **cod de legare** afișat în aplicație (salvăm `telegram_chat_id` / `viber_id`). Dacă nu e conectat, reminder-ul rămâne doar în aplicație.
- Notificările pentru **șoferi și admini** sunt **în aplicație** (ex. „adminul ți-a adăugat o lecție mâine la 10:00").
- Pune trimiterea notificărilor ca **modul separat, ușor de activat/dezactivat** prin variabile de mediu (tokenii boților).

---

## Cerințe de UX (critice — public 20–70 ani)
- **Bilingv RO + RU**, cu comutator de limbă salvat per utilizator.
- **Fonturi mari, butoane mari** (țintă tap minim 48px), contrast ridicat.
- **Cod de culori pentru statusuri:** verde = confirmat/efectuat, roșu = nu s-a prezentat, gri = anulat, albastru = programat.
- **Navigare jos (bottom nav)**, folosire cu o singură mână.
- **Tastatură numerică mare** la introducerea PIN-ului.
- Stări goale și de încărcare prietenoase, mesaje de eroare în limbaj simplu (fără termeni tehnici).
- PWA: instalabilă + citirea programului zilei **funcționează offline**.

## Checklist de securitate
- PIN-uri criptate (bcrypt/argon2); niciodată în clar nici în loguri.
- Rate-limiting + blocare cont după încercări eșuate.
- Cheia `service_role` Supabase doar pe server; clientul folosește doar cheia `anon` cu RLS activ.
- RLS pornit pe toate tabelele, cu politici restrictive per rol.
- Validare input cu zod la toate Server Actions.
- Cookie-uri securizate (httpOnly, secure, sameSite), protecție CSRF la mutații.
- Niciun PII expus clientului peste ce permite rolul.
- Audit log pentru acțiunile sensibile.
- Notă scurtă GDPR în README (consimțământ pentru date cursant, ștergere la cerere).

---

## Ordinea de construcție (faze — rulabil devreme)
1. **Fundație:** proiect Next.js + Supabase, schema + migrații + RLS + seed demo.
2. **Autentificare PIN** (selectare nume → PIN), roluri, blocare, sesiuni securizate.
3. **Șofer — esențial:** ecran „Azi", lista cursanților, adăugare cursant, adăugare programare, marcare status, remarci + screenshot.
4. **Admin — esențial:** gestionare șoferi + mașini, atribuire mașină, creare programări, calendar global cu filtre.
5. **Inteligență:** detectare conflicte, contor neprezentări, ore plătite vs. făcute, alerte ITP/asigurare.
6. **Dashboard + export** (Excel/PDF) + audit log.
7. **Notificări** Telegram/Viber + reminder automat cu o zi înainte.
8. **PWA + offline + finisaje** de accesibilitate (fonturi, culori, RO/RU).

## Livrabile
- Proiect Next.js complet, funcțional.
- Migrații SQL Supabase + politici RLS + script de seed cu date demo realiste (RO + RU).
- Fișier `.env.example` cu toate variabilele (chei Supabase, tokeni boți Telegram/Viber).
- **README în limba română** cu: cum instalezi, cum rulezi local, cum configurezi Supabase, cum creezi boții Telegram/Viber și unde pui tokenii, cum intri ca admin demo.

Începe cu Faza 1. Dacă ai întrebări de clarificare înainte, pune-le acum; altfel alege varianta cea mai simplă și sigură și mergi mai departe.