-- Lien d'offres client stable (fix 404 multi-devis, 12/07/2026).
-- Avant : accept_token_hash était rotationné à chaque devis et chaque relance ;
-- seul le clair du dernier email restait valide, tous les mails précédents
-- tombaient sur une 404 (le clair n'est pas récupérable depuis le hash).
-- Après : on persiste le token client EN CLAIR une seule fois (au submit) et on
-- le réutilise dans chaque email. La colonne accept_token_hash reste la clé de
-- lookup (inchangée) ; client_token sert uniquement à reconstruire l'URL stable.
ALTER TABLE car_requests ADD COLUMN IF NOT EXISTS client_token TEXT;
-- Même défaut, même fix côté verticale activités (page /activity-offer/{token}).
ALTER TABLE activity_requests ADD COLUMN IF NOT EXISTS client_token TEXT;
