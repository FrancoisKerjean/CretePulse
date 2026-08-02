-- Vitrine visiteur (lot C). Colonnes de faits manquantes plus note Airbnb.
-- La note et le nombre d avis vivent sur l annonce : c est un couple de scalaires,
-- une table dediee n apporterait qu une jointure. Aucune table d avis n est creee :
-- les TEXTES des avis ne sont pas atteignables dans le HTML statique d Airbnb
-- (mesure du 01/08/2026 : starRating et reviewCount y sont, comments non).
-- Spec : docs/superpowers/specs/2026-08-01-stays-vitrine-visiteur-design.md
alter table stay_listings add column if not exists bathrooms smallint;
alter table stay_listings add column if not exists area_sqm smallint;
-- Langue REELLE de `description`, issue de descriptionLanguage du scrape ou declaree
-- par le proprietaire. Jamais devinee : sans elle, aucune mention de langue n est
-- affichee sur la fiche.
alter table stay_listings add column if not exists description_locale text;
alter table stay_listings add column if not exists rating_avg numeric(3,2);
alter table stay_listings add column if not exists reviews_count integer;
alter table stay_listings add column if not exists reviews_captured_at timestamptz;
