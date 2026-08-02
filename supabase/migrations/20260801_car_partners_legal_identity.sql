-- Identite legale du loueur, sans laquelle aucune facture de commission ne peut
-- etre emise.
--
-- NovAI est une societe FRANCAISE, le loueur est GREC : la commission est une
-- prestation de services intra-UE, autoliquidee par le preneur (article 44 et
-- article 196 de la directive 2006/112/CE, article 283-2 du CGI). La facture
-- DOIT donc porter le numero de TVA du client, et son nom et son adresse
-- complete comme toute facture. `car_partners` ne portait rien de tout cela :
-- aucune facture conforme n etait produisible, pour personne.
--
-- TOUTES nullables, et c est deliberé : les dix loueurs actifs n ont aucune de
-- ces valeurs, un NOT NULL ferait echouer la migration ou remplirait la base de
-- chaines vides qui passeraient pour renseignees. C est la garde applicative
-- `partnerBillingIdentity` (src/lib/car-invoice.ts) qui refuse de facturer un
-- loueur incomplet, AVANT toute ecriture.
alter table public.car_partners
  -- Raison sociale. `name` existe deja mais porte le nom COMMERCIAL
  -- (« cretecar.rent »), qui n est pas le destinataire juridique de la facture.
  add column if not exists legal_name      text,
  -- Forme juridique (« Private company (IKE), Greece »). Non exigee pour
  -- facturer : elle est le plus souvent deja dans la raison sociale.
  add column if not exists legal_form      text,
  add column if not exists address_line    text,
  add column if not exists postal_code     text,
  add column if not exists city            text,
  add column if not exists country         text,
  -- Numero de TVA intracommunautaire (« EL801122501 »). Champ PIVOT : sans lui
  -- la mention d autoliquidation est impossible a porter et la declaration
  -- europeenne de services ne peut pas etre deposee.
  add column if not exists vat_id          text,
  -- Date de la verification VIES, quand elle a REELLEMENT eu lieu. La facture
  -- validee par le comptable affirme « verified against the European Commission
  -- VIES database on <date> and returned as valid » : cette phrase ne s imprime
  -- que si cette colonne est remplie. Une facture generee ne peut pas affirmer
  -- un controle qui n a pas ete fait.
  add column if not exists vat_verified_at date;

-- ⛔ Droits : RIEN a redonner ici, et c est verifie, pas suppose.
-- Mesure sur la base avant la migration (`\dp public.car_partners`) :
--     public | car_partners | table | postgres=arwdDxtm/postgres
--                                   | service_role=arwdDxtm/postgres
-- La table est deja fermee a `anon` et `authenticated`, sans droits par colonne.
-- `alter table ... add column` ne touche NI les droits de table NI les droits de
-- colonne : les colonnes neuves heritent de l ACL de la table. Un `grant` a plat
-- ici serait au mieux inutile, au pire une occasion de reouvrir la table.
-- ⚠️ Le raisonnement inverse vaut pour une table NEUVE : sans grant explicite,
-- elle nait permissive (anon en lecture, authenticated en ecriture complete),
-- cf. l en-tete de 20260801_car_commission_invoices.sql.

-- PostgREST self-hosted : sans ce reload, les colonnes restent invisibles du
-- client, et la garde applicative refuserait de facturer TOUT LE MONDE.
notify pgrst, 'reload schema';
