-- Relevance hledání: inzeráty se slovem v názvu/firmě/místě řadíme před ty, kde je slovo
-- jen v popisu (např. „řidič“ vs. „řidičský průkaz výhodou“). Navazuje na 20260915_jobs_search.sql.
alter table jobs add column if not exists search_title text
  generated always as (
    lower(public.immutable_unaccent(
      coalesce(title_cs, '') || ' ' ||
      coalesce(title_no, '') || ' ' ||
      coalesce(company, '') || ' ' ||
      coalesce(location_city, '') || ' ' ||
      coalesce(location_county, '')
    ))
  ) stored;

create index if not exists jobs_search_title_trgm
  on jobs using gin (search_title extensions.gin_trgm_ops);
