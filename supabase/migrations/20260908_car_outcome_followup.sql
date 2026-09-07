-- Suivi d'issue après la fin de location, et relance de facture de commission
-- (spec docs/superpowers/specs/2026-09-07-car-outcome-commission-design.md).
--
-- Le cron car-commission-invoice PRÉSUME « louée » au premier jour et facture.
-- Personne ne confirmait ensuite, et une location écartée par ce cron (fiche
-- loueur incomplète, départ antérieur au 05/08) n'avait aucune seconde chance.
-- Ces colonnes portent : qui a posé l'issue, le jeton du lien loueur, et le
-- calendrier des trois emails de question puis de l'escalade ops.

alter table public.car_requests
  -- Qui a posé l'issue : 'auto' = présomption du cron au J1, 'partner_link' =
  -- clic du loueur, 'admin' = back-office. Sans elle, présumé et confirmé se
  -- lisent pareil.
  add column if not exists outcome_source text
    check (outcome_source in ('partner_link', 'admin', 'auto')),
  -- Jeton STABLE en clair, même arbitrage que client_token (20260712) : trois
  -- emails à trois jours d'intervalle, un seul lien vivant. Un jeton rotatif
  -- ferait tomber les deux premiers emails en 404.
  add column if not exists outcome_token text unique,
  add column if not exists outcome_followup_count smallint not null default 0,
  add column if not exists outcome_followup_sent_at timestamptz,
  add column if not exists outcome_followup_escalated_at timestamptz;

alter table public.car_commission_invoices
  -- Rappel J+15 envoyé. NULL = jamais relancée. La remontée ops J+30 n'a pas de
  -- colonne : elle est volontairement répétée à chaque passage tant que due.
  add column if not exists reminded_at timestamptz;

-- Rétro-remplissage des issues déjà posées : elles viennent toutes du
-- back-office, SAUF celles que le cron de facturation a basculées lui-même.
update public.car_requests set outcome_source = 'admin'
  where outcome is not null and outcome_source is null;

-- Le cron tourne à 05:00 UTC et pose outcome_at dans les secondes qui suivent.
-- Un clic admin « Loué » appelle AUSSI requestCommission dans la foulée, donc
-- « outcome_at à la minute près de issued_at » (idée de la spec, section 5) ne
-- sépare pas les deux : c'est l'HEURE de la bascule qui les sépare. Une issue
-- « louée » posée entre 05:00:00 et 05:10:00 UTC avec une facture émise dans
-- la même fenêtre est une présomption du cron : elle recevra la question de
-- confirmation à J+1, ce qui en fait le premier test réel du circuit.
update public.car_requests r set outcome_source = 'auto'
  from public.car_commission_invoices i
  where i.request_id = r.id
    and r.outcome = 'rented'
    and r.outcome_source = 'admin'
    and (r.outcome_at at time zone 'UTC')::time between '05:00:00' and '05:10:00'
    and (i.issued_at at time zone 'UTC')::time between '05:00:00' and '05:10:00'
    and i.issued_at::date = r.outcome_at::date;

-- Pas d'index : car_requests compte moins d'un millier de lignes (limit(1000)
-- de la page admin) et les deux passes lisent une fois par jour.

notify pgrst, 'reload schema';
