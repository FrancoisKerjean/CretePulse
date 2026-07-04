-- Back-office /admin/car-rental : suivi de l'ISSUE d'une demande après le
-- cycle automatique sent → quoted → accepted (appel d'offres). Saisie
-- manuelle par Kami : la location a-t-elle eu lieu, pour quel montant,
-- la commission a-t-elle été encaissée.
--   outcome            : 'rented' (location effectuée) | 'lost' | null
--   final_amount_eur   : montant final réel (pré-rempli au quoted_price côté UI)
--   commission_paid_at : null = commission due, non-null = encaissée
alter table public.car_requests
  add column if not exists outcome            text,
  add column if not exists outcome_at         timestamptz,
  add column if not exists final_amount_eur   numeric,
  add column if not exists commission_paid_at timestamptz,
  add column if not exists admin_note         text;

notify pgrst, 'reload schema';
