-- Arrêts "admitted" (hors allowlist, géocodés au mieux) à valider manuellement.
alter table bus_stops add column if not exists needs_review boolean not null default false;
notify pgrst, 'reload schema';
