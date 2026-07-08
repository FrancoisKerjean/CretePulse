-- Géocodage des affiliés existants — Lot 1 (2026-07-08)
-- À appliquer APRÈS la migration 20260708_affiliates_geo.sql + NOTIFY reload schéma PostgREST.
-- NE PAS inclure dans le fichier de migration (UPDATEs data ≠ schéma).
--
-- Sources de précision :
--   EXACT   = adresse exacte géocodée via Nominatim/OpenStreetMap
--   LISTED  = coordonnées déjà présentes dans src/data/sponsored-places.json (saisies manuellement le 05/07)
--   TRIPADV = coordonnées publiées sur TripExpress.org / TripAdvisor
--   WANDLOG = coordonnées extraites de Wanderlog (adresse ΒΙ.ΠΕ. Heraklion)

-- halepa-hotel : El. Venizelou 164, 731 33 Chania (quartier Halepa)
-- Source : Nominatim OSM — EXACT (adresse vérifiée booking.com / halepa.com)
UPDATE affiliates
SET latitude = 35.5175, longitude = 24.0363
WHERE slug = 'halepa-hotel';

-- jmp-chania-tours : Chania city centre — agence/tours, zone portuaire
-- Source : LISTED — src/data/sponsored-places.json (lat=35.5138, lng=24.018, saisie manuelle 05/07)
UPDATE affiliates
SET latitude = 35.5138, longitude = 24.018
WHERE slug = 'jmp-chania-tours';

-- travel-in-chania : Theotokopoulou 22, 731 00 Chania (Vieille Ville)
-- Source : Nominatim OSM — EXACT (adresse vérifiée sur travelinchania.gr)
UPDATE affiliates
SET latitude = 35.5173, longitude = 24.0153
WHERE slug = 'travel-in-chania';

-- theodosi-restaurant : Paparigopoulou 99, Parigoria, Chania Town
-- Source : TRIPADV — TripExpress.org coords 35.507736 / 23.998396 (précision ~10 m)
UPDATE affiliates
SET latitude = 35.5077, longitude = 23.9984
WHERE slug = 'theodosi-restaurant';

-- roadcrete : ΒΙ.ΠΕ. (Zone Industrielle) Heraklion — statut = disabled (ne s'affiche pas sur la carte)
-- Source : WANDLOG — Wanderlog listing coords 35.319002 / 25.169586 (adresse ΒΙ.ΠΕ. Heraklion 716 01)
UPDATE affiliates
SET latitude = 35.319, longitude = 25.1696
WHERE slug = 'roadcrete';
