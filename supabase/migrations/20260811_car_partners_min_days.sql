-- Duree minimale de location exigee par le loueur, en jours.
--
-- Le renseignement arrive par COURRIER : « our minimum rental is 3 days » est
-- une phrase que les loueurs ecrivent souvent, et qui n avait nulle part ou
-- atterrir. `car_partners` portait 33 colonnes, aucune sur la duree.
-- L ecriture se fera par kairos-inbox, apres validation humaine d une
-- proposition (spec docs/superpowers/specs/2026-08-11-kairos-inbox-actions-design.md),
-- ou a la main comme les huit activations de loueurs precedentes.
--
-- NULLABLE, et c est delibere : NULL veut dire « on ne sait pas », ce qui est
-- le cas des onze loueurs actifs aujourd hui. Un defaut a 1 mentirait sur ce
-- qu on sait d eux, et un NOT NULL ferait echouer la migration.
--
-- ⛔ Cette colonne N A ENCORE AUCUN EFFET sur l appel d offres : un loueur a
-- trois jours minimum continuera de recevoir des demandes de deux jours. Le
-- filtrage des invitations (car_quote_invites) est un chantier distinct, a
-- trancher apres avoir vu la donnee se remplir.
alter table public.car_partners
  add column if not exists min_days integer;

comment on column public.car_partners.min_days is
  'Duree minimale de location en jours, declaree par le loueur. NULL = inconnue.';

-- ⛔ `alter table ... add column` ne touche NI les droits de table NI les
-- droits de colonne : le `grant select, insert, update ... to service_role` de
-- 20260704_car_partners_registry.sql couvre deja la colonne neuve. Rien a
-- re-granter.

-- ⛔ INDISPENSABLE ici : l API est servie par un PostgREST self-heberge
-- (conteneur `cretepulse-postgrest` sur le VPS). Sans ce NOTIFY il garde son
-- cache de schema et la colonne reste INVISIBLE a l API, alors qu elle existe
-- bien dans information_schema. Le symptome se lit comme une migration ratee.
notify pgrst, 'reload schema';
