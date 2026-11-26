-- Date du verrou de paiement de l'acompte voiture (booking_status pending_payment).
-- Posée par la route de paiement avec le verrou, gardée à l'écriture de la
-- session Stripe, remise à null par chaque chemin qui sort de pending_payment.
-- Le cron car-deposit-deadline libère un verrou resté sans session au-delà de
-- 35 minutes (fonction tuée entre le verrou et la session). Avec une session,
-- la date sert d'horloge à l'alerte « Stripe illisible depuis plus d'une
-- heure » : remise à null quand l'alerte part, pour qu'elle ne parte qu'une fois.
--
-- Migration additive : sans effet tant que le code ne lit pas la colonne. Elle
-- part AVANT le code, interrupteur éteint compris : la route de paiement et le
-- webhook l'écrivent, et le cron car-deposit-deadline la lit à CHAQUE passage
-- (toutes les 15 min), quel que soit l'interrupteur.
alter table car_requests add column if not exists booking_locked_at timestamptz;

-- PostgREST : recharger le cache de schéma pour exposer la colonne.
notify pgrst, 'reload schema';
