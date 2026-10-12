-- Souhlas s rozesílkou novinek. Zdrojem pravdy je naše databáze, ne seznam kontaktů
-- v Resendu — jinak bychom nevěděli, komu smíme psát, a odhlášení by šlo jen přes Resend.
--
-- Výchozí true: stávající uživatelé se registrovali, když web žádnou volbu nenabízel,
-- a jde o informace o službě, kterou si sami založili. Odhlásit se můžou jedním klikem
-- v profilu i v patičce každého e-mailu.
alter table profiles add column if not exists marketing_opt_in boolean not null default true;

-- Kdy se uživatel odhlásil (NULL = nikdy). Pro případné dotazy „odkdy nechodí e-maily".
alter table profiles add column if not exists marketing_changed_at timestamptz;

-- Rozesílka se ptá „komu smím poslat" → index jen na těch, kdo souhlas mají
create index if not exists profiles_marketing_opt_in_idx on profiles (marketing_opt_in)
  where marketing_opt_in = true;

-- Uživatel musí smět měnit vlastní volbu z profilu (klientský dotaz pod RLS).
-- Pokud už politika na úpravu vlastního řádku existuje, nic se neděje.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles' and cmd = 'UPDATE'
  ) then
    create policy "update own profile" on profiles
      for update using (auth.uid() = id) with check (auth.uid() = id);
  end if;
end $$;
