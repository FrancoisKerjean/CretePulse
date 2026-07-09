-- Catalogue d'exemples d'activités affichés sur /activities (spec 2026-07-09).
-- Items réels scrapés de prestataires ciblés, ANONYMISÉS côté front :
-- source_url/source_name sont internes (prospection + règle anti-invention)
-- et ne doivent JAMAIS être SELECT par la lib de lecture front.
-- Mêmes conventions que 20260709_activities_multi_quote.sql :
-- service_role only, grants explicites, notify pgrst.

create table if not exists public.activity_catalog_items (
  id             bigint generated always as identity primary key,
  category       text not null references public.activity_categories(slug),
  city           text not null,              -- chania|rethymno|heraklion|agios-nikolaos|ierapetra
  title          text not null,              -- EN, reformulé (jamais copié verbatim du site source)
  summary        text not null,              -- EN, 1-2 phrases, reformulé
  duration_label text,                       -- forme numérique universelle uniquement : '~3h', '6-7h'
  price_from_eur integer,                    -- prix public constaté arrondi ; NULL = pas de prix affiché
  price_seen_at  date,                       -- date de constat du prix public (règle source datée)
  translations   jsonb not null default '{}'::jsonb, -- { fr: {title, summary}, de: {...}, ... } 21 locales
  source_url     text not null,              -- INTERNE uniquement, jamais renvoyé au front
  source_name    text not null,              -- INTERNE uniquement
  partner_id     bigint references public.activity_partners(id), -- lié à la signature ; ON DELETE RESTRICT intentionnel (l'item survit au départ d'un partenaire)
  active         boolean not null default true,
  display_order  integer not null default 0, -- tri au sein d'un combo
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(), -- pas de trigger : le seed/l'app doivent le poser à chaque UPDATE
  constraint activity_catalog_items_source_url_title_key unique (source_url, title) -- clé d'upsert idempotent du seed
);
create index if not exists activity_catalog_combo_idx
  on public.activity_catalog_items (category, city, active);

revoke all on public.activity_catalog_items from anon, authenticated;
grant select, insert, update on public.activity_catalog_items to service_role;
grant usage, select on sequence public.activity_catalog_items_id_seq to service_role;

notify pgrst, 'reload schema';
