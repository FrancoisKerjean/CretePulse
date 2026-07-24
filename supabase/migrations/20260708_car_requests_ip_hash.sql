-- Anti-abus /car-rental : rate-limit par IP.
-- On stocke le SHA256(IP + sel) — jamais l'IP en clair (RGPD) — pour compter
-- les demandes d'une même origine dans une fenêtre glissante et bloquer le
-- spam du fan-out loueurs (changer d'email bypasse la dédup, pas l'IP).
ALTER TABLE car_requests ADD COLUMN IF NOT EXISTS ip_hash text;

-- Index pour le comptage (ip_hash, created_at) de la route submit.
CREATE INDEX IF NOT EXISTS idx_car_requests_ip_hash_created
  ON car_requests (ip_hash, created_at);
