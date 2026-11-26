-- Date du verrou de paiement de l'acompte voiture (booking_status pending_payment).
-- Posée par la route de paiement avec le verrou, gardée à l'écriture de la
-- session Stripe, remise à null par chaque chemin qui sort de pending_payment.
-- Le cron car-deposit-deadline libère un verrou resté sans session au-delà de
-- 35 minutes (fonction tuée entre le verrou et la session).
--
-- Migration additive : sans effet tant que le code ne lit pas la colonne. Elle
-- part AVANT le code qui l'écrit (route de paiement, webhook).
alter table car_requests add column if not exists booking_locked_at timestamptz;

-- PostgREST : recharger le cache de schéma pour exposer la colonne.
notify pgrst, 'reload schema';
