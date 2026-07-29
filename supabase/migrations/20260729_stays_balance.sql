-- crete.direct Stays : solde 70 % (lot A, 29/07/2026)
-- Convention du repo : idempotent, grants explicites, finit par notify pgrst.
-- Cible = Postgres VPS `cretepulse-postgres`, PAS le projet Supabase (vestige en pause).

alter table public.stay_requests
  add column if not exists balance_token_hash text unique,
  add column if not exists balance_requested_at timestamptz;

-- Sert le cron de demande de solde : filtre statut puis date d'arrivee.
create index if not exists stay_requests_balance_due_idx
  on public.stay_requests (status, date_from);

-- Passe une demande deja payee d'acompte au statut confirme, une seule fois.
-- Le garde-fou est le `and status = 'deposit_paid'` : un second appel du webhook
-- ne remet rien a jour et renvoie zero ligne, ce que l'appelant traite en no-op.
create or replace function public.mark_stay_balance_paid(
  p_request_id bigint,
  p_payment_intent_id text
)
returns setof public.stay_requests
language plpgsql
as $$
declare
  r public.stay_requests;
begin
  update public.stay_requests
     set status = 'confirmed',
         balance_paid_at = now(),
         balance_payment_intent_id = p_payment_intent_id
   where id = p_request_id
     and status = 'deposit_paid'
   returning * into r;

  if r.id is null then
    return;
  end if;

  return next r;
end $$;

grant execute on function public.mark_stay_balance_paid(bigint, text) to service_role;

notify pgrst, 'reload schema';
