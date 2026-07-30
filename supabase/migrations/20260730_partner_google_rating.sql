-- Note Google des loueurs, affichee dans /admin/car-rental.
--
-- Sert a arbitrer : qui on invite, qui on met en avant, quel loueur tire la
-- reputation du roster vers le bas. La note n'est jamais saisie a la main :
-- elle vient de Places API (src/lib/google-rating-server.ts), et n'est ecrite
-- que si la fiche a ete appariee au loueur avec certitude.
--
-- `google_place_id` est la seule colonne editable depuis le back-office :
-- elle sert a corriger un appariement que la recherche automatique rate.
-- `google_rating_at` est horodatee meme quand aucune fiche ne correspond,
-- sinon le cron rejoue le meme loueur introuvable a chaque passe.

alter table public.car_partners
  add column if not exists google_place_id     text,
  add column if not exists google_rating       numeric,
  add column if not exists google_rating_count integer,
  add column if not exists google_maps_url     text,
  add column if not exists google_rating_at    timestamptz;

-- Une note hors echelle Google trahit un bug d'ecriture, pas une donnee reelle.
alter table public.car_partners
  drop constraint if exists car_partners_google_rating_range;
alter table public.car_partners
  add constraint car_partners_google_rating_range
  check (google_rating is null or (google_rating >= 0 and google_rating <= 5));

notify pgrst, 'reload schema';
