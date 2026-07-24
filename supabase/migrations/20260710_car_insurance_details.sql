-- Assurance déclarée par le loueur dans son devis voiture.
-- Le site ne promet PAS "zéro franchise partout" : chaque loueur déclare sa
-- couverture réelle (all_risk_zero = franchise nulle ; cdw_excess = franchise > 0),
-- le montant est confirmé au devis (cf page /car-rental) et le client compare.
-- Toutes les colonnes sont nullable : rétro-compat totale avec les devis existants.

-- Devis (option) soumis par le loueur.
ALTER TABLE public.car_quote_options
  ADD COLUMN IF NOT EXISTS insurance_type text,               -- 'all_risk_zero' | 'cdw_excess'
  ADD COLUMN IF NOT EXISTS excess_eur numeric,                -- franchise si cdw_excess
  ADD COLUMN IF NOT EXISTS zero_excess_upsell_eur_day numeric; -- surcoût /jour pour passer à zéro franchise

-- Snapshot de la meilleure option sur l'invite (cockpit / relances / commissions).
ALTER TABLE public.car_quote_invites
  ADD COLUMN IF NOT EXISTS quote_insurance_type text,
  ADD COLUMN IF NOT EXISTS quote_excess_eur numeric,
  ADD COLUMN IF NOT EXISTS quote_zero_excess_upsell_eur_day numeric;

-- Snapshot de l'option choisie sur la demande (admin / commissions / historique).
ALTER TABLE public.car_requests
  ADD COLUMN IF NOT EXISTS quoted_insurance_type text,
  ADD COLUMN IF NOT EXISTS quoted_excess_eur numeric,
  ADD COLUMN IF NOT EXISTS quoted_zero_excess_upsell_eur_day numeric;

-- Défauts du loueur : pré-remplissage du formulaire /car-quote (envoi en un clic).
ALTER TABLE public.car_partners
  ADD COLUMN IF NOT EXISTS default_insurance_type text,
  ADD COLUMN IF NOT EXISTS default_excess_eur numeric,
  ADD COLUMN IF NOT EXISTS default_zero_excess_upsell_eur_day numeric;
