-- Enrichissement de la demande de location : préférence d'assurance et mode de
-- paiement (optionnels, saisis par le client dans le wizard, transmis au loueur
-- pour un devis plus précis).
--   insurance      : 'full' (tous risques) | 'basic' | null (peu importe)
--   payment_method : 'cash' | 'card' | null (peu importe)
alter table public.car_requests
  add column if not exists insurance      text,
  add column if not exists payment_method text;

notify pgrst, 'reload schema';
