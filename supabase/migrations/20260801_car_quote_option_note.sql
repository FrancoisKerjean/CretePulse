-- Note libre du loueur sur une option de devis, affichée au client.
--
-- Née le 01/08/2026 : sur la demande 42 (Chania Airport, city car, 4 pax),
-- Luxtrans n'avait pas la catégorie demandée. Il a proposé un VW T-Cross
-- automatique à 580 € contre 320 € pour une citadine, puis a dû l'expliquer par
-- TROIS emails successifs, faute de pouvoir l'écrire dans son devis. Le client,
-- lui, ne voyait qu'un prix 81 % plus cher sans savoir pourquoi.
--
-- ⛔ Le contenu est nettoyé côté application (normalizeQuoteOption) : emails et
-- numéros de téléphone retirés, 140 caractères max. Cette note s'affiche au
-- client, y laisser des coordonnées permettrait de court-circuiter la mise en
-- relation, donc la commission.
alter table public.car_quote_options
  add column if not exists note text;

comment on column public.car_quote_options.note is
  'Note libre du loueur affichee au client (140 car. max, coordonnees retirees a la normalisation).';
