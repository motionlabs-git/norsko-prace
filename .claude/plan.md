# Plán: Norský pracovní portál pro CZ/SK sezónní pracovníky

## Náklady

| Fáze | Měsíční náklady |
|------|----------------|
| MVP | **$0** (Vercel Hobby + Supabase Free + Azure Translator Free 2M) |
| Růst | ~$50/měsíc (Vercel Pro nebo VPS + Supabase Pro + Azure Translator) |

Klíčová optimalizace: každý inzerát se překládá **jednou** a výsledek se uloží do DB. Žádné opakované API volání.

---

## Kontext

Projekt cílí na Czech/Slovak uživatele, kteří hledají sezónní práci v Norsku. Hlavní hodnota: automaticky stažené, přeložené a přefiltrované inzeráty z norského úřadu práce NAV, doplněné o SEO blog s průvodci procesem (D-number, BankID, bydlení). Monetizace zatím otevřená — pravděpodobně online kurz nebo premium obsah.

---

## Tech stack

| Vrstva | Technologie |
|--------|-------------|
| Frontend + SSR | Next.js 14+ (App Router) |
| Databáze | Supabase (Postgres + Auth + Storage) |
| i18n | next-intl (cs + sk od začátku) |
| Blog | MDX (vestavěná podpora Next.js) |
| Překlad | Azure Translator (2M znaků/měsíc zdarma) |
| Cron | Vercel Cron Jobs (API route trigger) |
| Styling | Tailwind CSS |
| Hosting | Vercel |

---

## Architektura

```
NAV API (každých 6h via Vercel Cron)
  → /app/api/sync/route.ts
      → fetch nových inzerátů
      → filtrování (kategorie + klíčová slova)
      → Azure Translator překlad (cs + sk)
      → uložení do Supabase

Next.js App Router
  /[locale]/                    → homepage
  /[locale]/prace/              → přehled inzerátů (ISR)
  /[locale]/prace/[slug]/       → detail inzerátu (SSG)
  /[locale]/blog/               → přehled článků (SSG)
  /[locale]/blog/[slug]/        → článek (MDX, SSG)
  /app/api/sync/route.ts        → cron endpoint (CRON_SECRET auth)
```

---

## Databázové schéma (Supabase)

```sql
CREATE TABLE jobs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nav_id        text UNIQUE NOT NULL,       -- ID z NAV API
  title_no      text,
  title_cs      text,
  title_sk      text,
  description_no text,
  description_cs text,
  description_sk text,
  company       text,
  location      text,
  category      text,                       -- STYRK/ISCO kód nebo label
  salary        text,
  published_at  timestamptz,
  expires_at    timestamptz,
  source_url    text,                       -- odkaz na originál nav.no
  is_featured   boolean DEFAULT false,      -- připraveno pro paywall/premium
  created_at    timestamptz DEFAULT now()
);

-- index pro rychlé listování
CREATE INDEX jobs_published_at_idx ON jobs (published_at DESC);
CREATE INDEX jobs_expires_at_idx ON jobs (expires_at);
```

---

## NAV API integrace (pam-stilling-feed)

> ⚠️ Starý `pam-public-feed` byl zrušen 1. 5. 2025. Používáme nový `pam-stilling-feed`.

**Base URL:** `https://pam-stilling-feed.nav.no/`
**Auth:** Bearer token — public token dostupný na `GET /api/publicToken`
**Hlavní endpoint:** `GET /api/v1/feed`
**Incremental sync:** header `If-Modified-Since` (RFC-1123 formát)

**Feed mechanika:**
- Event-driven changelog — každá změna inzerátu = nová položka v feedu
- Stránkování přes `next_url` v odpovědi
- `status: ACTIVE | INACTIVE` — INACTIVE = smazaný/expirovaný inzerát
- Detail inzerátu: GET na URL z každé položky feedu

**Response struktura (kompletní vacancy):**
```typescript
interface Vacancy {
  uuid: string
  status: 'ACTIVE' | 'INACTIVE'
  sistEndret: string  // ISO-8601
  json: {
    uuid: string
    published: string     // ISO-8601
    expires: string       // ISO-8601
    title: string
    description: string   // HTML content
    jobtitle: string
    applicationUrl: string
    applicationDue: string
    sourceurl: string
    engagementtype: string  // 'Fast', 'Vikariat', 'Sesong', ...
    extent: string          // 'Heltid' | 'Deltid'
    sector: string          // 'Privat' | 'Offentlig'
    positioncount: string
    starttime: string
    employer: {
      name: string
      orgnr: string
      description: string
      homepage: string
    }
    workLocations: Array<{
      country: string
      city: string
      postalCode: string
      county: string        // fylke (kraj)
      municipal: string     // kommune (obec)
    }>
    occupationCategories: Array<{
      level1: string        // hlavní kategorie
      level2: string        // podkategorie
    }>
    categoryList: Array<{
      categoryType: string  // 'STYRK08' | 'ESCO' | ...
      code: string
      name: string
    }>
    contactList: Array<{
      name: string
      email: string
      phone: string
      role: string
    }>
  }
}
```

**Filtrování sezónních pozic (client-side, feed nefiltruje):**
```typescript
const SEASONAL_OCCUPATION_CATEGORIES = [
  'Jordbruk, skogbruk og fiske',
  'Reiseliv og mat',
  'Bygg og anlegg',
  'Transport og logistikk',
]

const SEASONAL_ENGAGEMENT_TYPES = [
  'Sesong', 'Vikariat', 'Midlertidig'
]

// Inzerát projde filtrem pokud:
// - occupationCategories.level1 je v SEASONAL_OCCUPATION_CATEGORIES NEBO
// - engagementtype je v SEASONAL_ENGAGEMENT_TYPES
```

**Sync flow:**
```
1. GET /api/publicToken → ulož token
2. GET /api/v1/feed (If-Modified-Since: poslední sync)
3. Pro každou ACTIVE položku: filtrovat → překládat → upsert do DB
4. Pro INACTIVE položky: označit jako expirované v DB (soft delete)
5. Opakovat přes next_url dokud next_url === null
```

---

## i18n struktura (next-intl)

```
/messages/
  cs.json    → překlady UI
  sk.json    → překlady UI

/app/[locale]/layout.tsx
/middleware.ts  → locale detection + redirect
```

Locales: `cs` (default), `sk`

Překlad inzerátů (obsah) jde přes Azure Translator při sync — uložen přímo v DB.
Překlad UI (navigace, tlačítka) jde přes next-intl JSON soubory.

---

## Blog (MDX)

```
/content/
  cs/
    jak-ziskat-d-number-norsko.mdx
    bankid-cizinec-navod.mdx
    ...
  sk/
    ...
```

Frontmatter každého článku:
```yaml
---
title: "Jak získat D-number v Norsku: kompletní průvodce"
description: "..."
publishedAt: "2024-03-01"
category: "průvodce"
---
```

---

## Design systém

Inspirace: lentoagency.com (font, barvy) + arbeidsplassen.nav.no (layout job listingu) + user preference (clean, smooth, zaoblené)

**Typografie:**
- Hlavní font: **Manrope** (Google Fonts) — weights 400, 500, 600, 700
- Monospace (blog kód): **Roboto Mono**

**Barevná paleta:**
```css
--color-bg:        #FAFAF8;   /* warm off-white */
--color-surface:   #FFFFFF;   /* karty */
--color-primary:   #046353;   /* teal — primární akce, linky */
--color-primary-light: #E8F4F1; /* hover pozadí na primárních prvcích */
--color-text:      #1C1C1C;   /* hlavní text */
--color-text-muted:#6B7280;   /* metadata, popisky */
--color-border:    #E5E7EB;   /* bordery karet */
--color-accent:    #DA571F;   /* orange — badge "Nové", zvýraznění */
```

**Border-radius:**
```css
--radius-sm:  8px;   /* inputy, tagy */
--radius-md:  16px;  /* karty, modaly */
--radius-full: 9999px; /* tlačítka pill, badges */
```

**Komponenty (Figma návrhy):**
1. **Homepage** — hero s vyhledáváním, sekce s featured jobs, jak to funguje (3 kroky), CTA na blog
2. **Job listing** — 2-sloupce (filtry vlevo, karty vpravo), job karta (název, firma, lokace, typ, deadline)
3. **Job detail** — hlavička s klíčovými info, popis, apply button, breadcrumb
4. **Blog listing** — grid článků s kategorií, titulkem, perexem
5. **Blog detail** — long-form article layout, sidebar s relevantními inzeráty

## SEO

- `generateMetadata()` na každé stránce (Next.js App Router)
- `sitemap.xml` generovaný dynamicky (`/app/sitemap.ts`)
- `robots.txt`
- Strukturovaná data (JSON-LD) pro job listings (JobPosting schema)
- Canonical URLs pro cs/sk varianty

---

## MVP scope (fáze 1) — pořadí implementace

1. **Next.js scaffold** — `create-next-app`, TypeScript, Tailwind, next-intl, Manrope font
2. **Figma návrhy** — homepage, job listing, job detail, blog (5 stránek)
3. **Supabase** — projekt + schéma výše + Row Level Security
4. **NAV sync pipeline** — `lib/nav-api.ts` + `lib/translate.ts` + `/api/sync` endpoint
5. **Vercel Cron** — `vercel.json` každých 6h
6. **Job listing stránky** — `/[locale]/prace/` s ISR (revalidate: 3600)
7. **Job detail stránky** — `/[locale]/prace/[slug]/`
8. **Blog** — MDX stránky, minimálně 3 články pro launch
9. **Základní SEO** — meta, sitemap, JobPosting JSON-LD

## Fáze 2 (po launchi)

- Newsletter signup (Resend / MailerLite)
- Email notifikace na nové inzeráty
- Premium/paywall (Stripe) pro `is_featured` inzeráty nebo online kurz
- Admin dashboard pro správu inzerátů

---

## Struktura projektu

```
/
├── app/
│   ├── [locale]/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── prace/
│   │   │   ├── page.tsx
│   │   │   └── [slug]/page.tsx
│   │   └── blog/
│   │       ├── page.tsx
│   │       └── [slug]/page.tsx
│   ├── api/
│   │   └── sync/route.ts       ← cron endpoint
│   └── sitemap.ts
├── content/
│   ├── cs/
│   └── sk/
├── lib/
│   ├── nav-api.ts              ← NAV API klient
│   ├── deepl.ts                ← Azure Translator wrapper
│   ├── supabase.ts             ← Supabase klient
│   └── jobs.ts                 ← business logika
├── messages/
│   ├── cs.json
│   └── sk.json
├── middleware.ts
└── vercel.json                 ← cron konfigurace
```

---

## Kritické soubory k vytvoření

| Soubor | Účel |
|--------|------|
| `lib/nav-api.ts` | Fetch + filtrování z NAV API |
| `lib/deepl.ts` | Překlad přes Azure Translator API |
| `app/api/sync/route.ts` | Cron endpoint (chráněn CRON_SECRET) |
| `lib/jobs.ts` | DB operace (upsert, list, get by slug) |
| `middleware.ts` | i18n locale routing |
| `vercel.json` | Cron schedule konfigurace |

---

## Ověření funkčnosti

1. Spustit `POST /api/sync` manuálně → zkontrolovat data v Supabase
2. Ověřit přeložené tituly a popisy v DB
3. Navštívit `/cs/prace/` a `/sk/prace/` → inzeráty se zobrazí
4. Zkontrolovat `sitemap.xml` — obsahuje job i blog URL pro obě lokalizace
5. Lighthouse SEO audit na job detail stránce
