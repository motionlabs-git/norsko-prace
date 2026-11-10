-- Dokumenty ke stažení (e-book, návody, checklisty) v profilu uživatele.
--
-- Soubory leží v SOUKROMÉM bucketu `documents`; stahuje se přes krátkodobý podepsaný
-- odkaz, který vydá server až po kontrole oprávnění. Proto se cesta k souboru
-- nikdy neposílá do prohlížeče.
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text,
  -- cesta uvnitř bucketu `documents`
  file_path text not null,
  -- 'all' = pro všechny přihlášené, 'premium' = jen pro předplatitele (a správce)
  access text not null default 'premium',
  size_bytes bigint,
  is_published boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'documents_access_check') then
    alter table documents add constraint documents_access_check check (access in ('all', 'premium'));
  end if;
end $$;

create index if not exists documents_published_idx on documents (is_published, sort_order);

alter table documents enable row level security;

-- Názvy a popisy může číst kdokoli (je z nich vidět, co Premium nabízí).
-- Samotný soubor chrání soukromý bucket, ne tahle politika.
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'documents' and policyname = 'documents readable'
  ) then
    create policy "documents readable" on documents for select using (is_published = true);
  end if;
end $$;

-- Zápis jen service_role (nahrávání z administrace) — žádná politika pro INSERT/UPDATE.
