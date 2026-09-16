-- Termín práce vytažený z inzerátu (AI), pro filtr „kdy chceš jet" v /prace (?od=…&do=…).
-- work_start NULL = termín neuveden; work_end NULL = bez konce (trvalé místo / neuvedeno).
alter table jobs add column if not exists work_start date;
alter table jobs add column if not exists work_end date;
-- kdy byl termín vyhodnocen (NULL = ještě ne) → idempotentní backfill
alter table jobs add column if not exists work_period_evaluated_at timestamptz;

create index if not exists jobs_work_period_idx on jobs (work_start, work_end);
