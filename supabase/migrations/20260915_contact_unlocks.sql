-- Bezplatné odemčení kontaktů: neplatící uživatel si může zobrazit kontakt u FREE_CONTACT_LIMIT
-- inzerátů (src/lib/entitlement.ts). Zápis jen přes API routu (service role), která hlídá limit.
create table if not exists contact_unlocks (
  user_id uuid not null references auth.users(id) on delete cascade,
  -- záměrně bez FK na jobs: cleanup-inactive maže expirované inzeráty a kaskáda by
  -- uživateli „vracela" spotřebované kontakty zpět
  job_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (user_id, job_id)
);

alter table contact_unlocks enable row level security;

create policy "own unlocks read" on contact_unlocks
  for select using ((select auth.uid()) = user_id);
-- žádná insert/update/delete policy → běžný uživatel nemůže limit obejít zápisem z klienta
