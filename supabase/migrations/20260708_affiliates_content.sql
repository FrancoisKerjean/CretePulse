-- Lot 2.5 P1 : colonnes photo + description localisée sur la table affiliates
-- Colonnes nullable → migration non-destructive
-- description : jsonb { en, fr, de, el }
-- Après application : NOTIFY pgrst, 'reload schema'; (voir tâche P2 pour le backfill)

alter table affiliates add column if not exists photo_url   text;
alter table affiliates add column if not exists description jsonb; -- { en, fr, de, el }
