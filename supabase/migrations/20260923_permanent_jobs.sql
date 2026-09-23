-- Stálé pozice (trvalé úvazky v manuálních oborech) vedle sezónních inzerátů.
-- job_type určuje větev syncu, která inzerát přinesla — ne typ úvazku samotný,
-- aby se obě větve nikdy nepřetahovaly o stejný řádek.
alter table jobs add column if not exists job_type text not null default 'seasonal';

-- Obor z NAV kategorie level2 (elektrikar, svarec, mechanik, instalater, ridic).
-- NULL u sezónních inzerátů — ty se oborem netřídí.
alter table jobs add column if not exists trade text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'jobs_job_type_check') then
    alter table jobs add constraint jobs_job_type_check
      check (job_type in ('seasonal', 'permanent'));
  end if;
end $$;

-- Výpis stálých pozic: filtr podle větve + oboru, řazení podle data vydání
create index if not exists jobs_job_type_idx on jobs (job_type, is_active, published_at desc);
create index if not exists jobs_trade_idx on jobs (trade) where trade is not null;

-- Každá větev syncu má vlastní kurzor — jinak by si navzájem přeskakovaly pozici ve feedu
alter table sync_log add column if not exists kind text not null default 'seasonal';
create index if not exists sync_log_kind_idx on sync_log (kind, synced_at desc);
