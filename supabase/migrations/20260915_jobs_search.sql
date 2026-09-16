-- Fulltextové hledání v přehledu inzerátů (/prace?q=…), bez ohledu na diakritiku
-- („kuchar" najde „Kuchař", „tromso" najde „Tromsø"). Dotaz: src/lib/jobs.ts → getJobs({ search }).
create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- unaccent() není IMMUTABLE, generovaný sloupec to ale vyžaduje → obal s pevným slovníkem
create or replace function public.immutable_unaccent(text)
returns text
language sql
immutable parallel safe strict
set search_path = ''
as $$ select extensions.unaccent('extensions.unaccent'::regdictionary, $1) $$;

-- Normalizovaný text k hledání; počítá se sám při každém insertu/updatu (sync nic neřeší)
alter table jobs add column if not exists search_text text
  generated always as (
    lower(public.immutable_unaccent(
      coalesce(title_cs, '') || ' ' ||
      coalesce(title_no, '') || ' ' ||
      coalesce(company, '') || ' ' ||
      coalesce(location_city, '') || ' ' ||
      coalesce(location_county, '') || ' ' ||
      regexp_replace(coalesce(description_cs, ''), '<[^>]+>', ' ', 'g')
    ))
  ) stored;

-- Trigramový index pro ilike '%…%'
create index if not exists jobs_search_text_trgm
  on jobs using gin (search_text extensions.gin_trgm_ops);
