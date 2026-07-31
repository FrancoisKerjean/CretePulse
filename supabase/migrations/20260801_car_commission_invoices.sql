-- Facture de commission loueur. Serie DEDIEE `NOVAI-CD-<annee>-NNN`, separee de
-- la sequence societe `NOVAI-2026-NNN` tenue a la main : sans cela un cron de 5h
-- du matin et une facture emise a la main le meme jour se disputeraient un numero.
-- Plusieurs series sont licites des lors que chacune est continue.

create table if not exists public.car_commission_invoices (
  id               bigint generated always as identity primary key,
  number           text not null unique,
  -- UNIQUE : idempotence STRUCTURELLE. Le verrou applicatif
  -- `commission_requested_at` est relache par releaseLock() en cas d'echec, donc
  -- il ne peut pas porter cette garantie a lui seul.
  request_id       bigint not null unique references public.car_requests(id),
  partner_id       bigint not null references public.car_partners(id),
  base_amount_eur  numeric(10,2) not null check (base_amount_eur > 0),
  rate             numeric(5,4)  not null check (rate > 0 and rate <= 0.5),
  amount_eur       numeric(10,2) not null check (amount_eur > 0),
  -- Le token n'est jamais stocke en clair : meme convention que
  -- car_requests.quote_token_hash.
  token_hash       text not null unique,
  issued_at        timestamptz not null default now(),
  -- NULL = numerotee mais jamais partie. Cet etat doit rester rattrapable.
  sent_at          timestamptz,
  paid_at          timestamptz,
  credited_at      timestamptz,
  credit_number    text unique,
  credit_reason    text
);

create index if not exists car_commission_invoices_partner_idx
  on public.car_commission_invoices (partner_id);

-- Compteur PAR ANNEE. Une sequence Postgres nue ne connait pas l'annee : elle
-- continuerait de compter le 1er janvier et produirait NOVAI-CD-2026-012 en 2027.
create table if not exists public.car_commission_invoice_counters (
  year     int primary key,
  last_seq int not null default 0
);

-- INSERT ... ON CONFLICT DO UPDATE ... RETURNING est atomique : deux appels
-- concurrents obtiennent deux numeros distincts, sans verrou explicite.
create or replace function public.next_car_invoice_number(prefix text default 'NOVAI-CD')
returns text language plpgsql as $$
declare
  y int := extract(year from (now() at time zone 'UTC'))::int;
  s int;
begin
  insert into public.car_commission_invoice_counters as c (year, last_seq)
  values (y, 1)
  on conflict (year) do update set last_seq = c.last_seq + 1
  returning c.last_seq into s;
  -- greatest(3, length(...)) : sans lui, lpad TRONQUE par la gauche au-dela de 999
  -- et fabrique une collision silencieuse (ex. lpad('1000', 3, '0') = '100').
  return prefix || '-' || y::text || '-' || lpad(s::text, greatest(3, length(s::text)), '0');
end;
$$;

-- Sans ce revoke, EXECUTE est accorde a PUBLIC par defaut a la creation d'une fonction :
-- le role anon pourrait appeler ce RPC sans authentification et bruler des numeros de facture.
revoke execute on function public.next_car_invoice_number(text) from public;
grant execute on function public.next_car_invoice_number(text) to service_role;

-- PostgREST self-hosted : sans ce reload, la table reste invisible du client.
notify pgrst, 'reload schema';
