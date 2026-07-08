-- Lot 1 : coordonnées géographiques sur la table affiliates
-- Colonnes nullable → migration non-destructive
-- Après application : NOTIFY pgrst, 'reload schema'; (voir scripts/seed-affiliate-geo.sql pour les UPDATEs)

alter table affiliates add column if not exists latitude  double precision;
alter table affiliates add column if not exists longitude double precision;
