# NorskoPráce — Claude Code Context

## Projekt

Pracovní portál nabízející sezónní pracovní inzeráty z Norska přeložené do češtiny a slovenštiny. Inzeráty jsou stahovány z norského úřadu práce NAV (pam-stilling-feed API), filtrovány pro sezónní pozice a automaticky překládány přes Azure Translator.

**Cíl:** Organická návštěvnost (SEO), monetizace přes online kurz (průvodce D-number, BankID, život v Norsku).

## Tech Stack

| Vrstva | Tech |
|--------|------|
| Framework | Next.js 16 (App Router, TypeScript) |
| Styling | Tailwind CSS v4 |
| i18n | next-intl (cs + sk, domain routing v budoucnu) |
| Databáze | Supabase (Postgres) |
| Překlad | Azure Translator (2M znaků/měsíc zdarma) |
| Cron | Vercel Cron Jobs |
| Hosting | Vercel + Supabase free tier |

## Design Systém

- **Font:** Manrope (400, 500, 600, 700, 800)
- **Primární barva:** `#046353` (teal)
- **Pozadí:** `#FAFAF8` (warm off-white)
- **Akcent:** `#DA571F` (orange)
- **Border-radius:** Zaoblené (16px karty, 9999px tlačítka pill)
- **Styl:** Clean, smooth, minimální — inspirace lentoagency.com

## Figma

Mockupy: https://www.figma.com/design/6htAAUpGzLcta95ItCYzqe
- 🏠 Homepage — hero + featured jobs + how it works
- 📋 Job Listing — filtry + karty inzerátů
- 📄 Job Detail + Blog — detail inzerátu + listing blogu

## NAV API

- **Base URL:** `https://pam-stilling-feed.nav.no`
- **Auth:** Bearer token z `/api/publicToken` (veřejný, rotuje)
- **Endpoint:** `GET /api/v1/feed` + header `If-Modified-Since` pro incremental sync
- **Filtrování:** client-side — sezónní kategorie + typ úvazku (viz `src/lib/nav-api.ts`)
- **Status:** ACTIVE | INACTIVE (INACTIVE = soft delete z DB)

## Struktura projektu

```
src/
├── app/
│   ├── [locale]/           # cs + sk routing
│   │   ├── layout.tsx      # Navbar + Footer wrapper
│   │   ├── page.tsx        # Homepage
│   │   ├── prace/          # Job listing + detail
│   │   └── blog/           # Blog listing + MDX články
│   ├── api/
│   │   └── sync/route.ts   # Cron endpoint (CRON_SECRET)
│   └── sitemap.ts
├── components/
│   ├── ui/                 # Button, Card, Badge, Navbar, Footer
│   └── jobs/               # JobCard, JobFilters, JobDetail
├── i18n/                   # next-intl routing + request config
├── lib/
│   ├── nav-api.ts          # NAV feed client ✅
│   ├── translate.ts        # Azure Translator wrapper
│   ├── supabase.ts         # Supabase client
│   └── jobs.ts             # DB operace
└── types/index.ts          # Všechny TypeScript typy ✅
messages/
├── cs.json                 # ✅
└── sk.json                 # ✅
content/
├── cs/                     # MDX blog články
└── sk/
```

## Environment Variables (vyžadované)

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Azure Translator
AZURE_TRANSLATOR_KEY=
AZURE_TRANSLATOR_REGION=

# Cron security
CRON_SECRET=

# Optional: NAV private token (stabilnější než public)
NAV_API_TOKEN=
```

## Hotovo ✅

- next-intl config, middleware, routing (cs/sk)
- TypeScript typy (Nav API + DB + Blog)
- Globální CSS (design tokens, Manrope font, prose)
- UI komponenty: Button, Card, Badge, Navbar, Footer
- App Router layout (`[locale]/layout.tsx`)
- `lib/nav-api.ts` — NAV feed client + filtrování sezónních pozic

## Zbývá

- `lib/translate.ts` — Azure Translator
- `lib/supabase.ts` + `lib/jobs.ts` — DB
- `app/api/sync/route.ts` — cron endpoint
- `vercel.json` — cron schedule
- Stránky: homepage, job listing, job detail, blog
- SEO: sitemap, JSON-LD, metadata

## Důležité poznámky

- Každý inzerát se překládá **jednou** a výsledek se uloží do DB — nikdy nepřekládáme znovu
- Inzeráty z Finn.no jsou v NAV feedu vyloučeny automaticky
- INACTIVE položky = soft delete (nastavit `is_active = false`, nesmazat)
- Locale routing: `/cs/prace/...` a `/sk/prace/...` (MVP), v budoucnu separate domains
