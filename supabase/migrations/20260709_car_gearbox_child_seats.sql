-- Enrichissement de la demande de location (retour loueur Lux Trans 08/07) :
-- boîte de vitesses souhaitée + sièges enfants requis. Optionnels, saisis par
-- le client dans le wizard, transmis au loueur pour un devis plus précis.
--   gearbox     : 'automatic' | 'manual' | null (peu importe)
--   child_seats : jsonb array de clés ('baby_cot' | 'baby_seat' | 'booster')
alter table public.car_requests
  add column if not exists gearbox     text,
  add column if not exists child_seats jsonb not null default '[]'::jsonb;

notify pgrst, 'reload schema';
