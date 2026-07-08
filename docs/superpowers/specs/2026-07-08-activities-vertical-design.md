# Verticale /activities — design (clone car-rental direct)

Date : 2026-07-08
Statut : validé par Kami (brainstorm 4 sections, session 08/07)
Référence : système car-rental direct (multi-devis, commission déclarative post-paid, zéro paiement en ligne)

## Contexte et objectif

Le trafic crete.direct est monétisé sur les activités via GetYourGuide (~8 % passif).
Le système car-rental direct prouve un modèle meilleur : mise en relation multi-devis,
la donnée de matching reste en base, commission déclarative 15-25 % facturée par NovAI SASU.
On décline ce système sur les activités touristiques. Déclencheur commercial : prospect
chaud Bonnie & Clyde Urban Tours (food tours, Chania).

**Périmètre MVP** : 3 catégories (food-tours, boat-trips, hiking) × 5 villes
(chania, rethymno, heraklion, agios-nikolaos, ierapetra) = 15 hubs SEO + 3 pages
catégories + 1 page mère = 19 pages visiteur.

**Hors périmètre** : paiement en ligne (Stripe), calendrier de disponibilités,
prix affichés en amont, avis, autres catégories/villes (extension par data, pas par code).

## Architecture

### Front visiteur (19 pages, 22 locales)
- `/activities` — page mère : présente les 3 catégories, wizard complet (étape 1).
- `/activities/[category]` — 3 pages : wizard ouvert à l'étape ville.
- `/activities/[category]/[city]` — 15 hubs SEO : wizard ouvert à l'étape date.
- `/activity-offer/[token]` — client : comparaison des devis, choix.
- `/activity-quote/[token]` — partenaire : deviser ou décliner.

Contenu i18n : `content.ts` par page, 22 locales assemblées par script jetable
`scripts/gen-activity-content.mjs` (clone `gen-car-content.mjs`) : en/fr/de/el rédigés
main, 18 autres traduits + vérification adversariale (diacritiques, exactitude, voix
de marque honnête, pas de garantie de revenus).

### API
- `POST /api/activities/submit` — rate-limit IP (SHA256 + sel, 4/h + 12/j), insert
  `activity_requests`, fan-out `activity_quote_invites` vers partenaires matchant
  `category_slug` + `city`, email Resend par partenaire avec lien `/activity-quote/[token]`.
- `POST /api/activities/quote` — partenaire : prix groupe + message + inclusions,
  ou déclinaison. Statut invite → `quoted`/`declined`, email client.
- `POST /api/activities/accept` — client : snapshot `quoted_*` sur la request,
  invite gagnante → `chosen`, autres → `not_chosen`, emails d'échange de coordonnées.
- Cron `GET /api/cron/activity-no-quote` (horaire) : request sans devis >24h → alerte Telegram.
- Cron `GET /api/cron/activity-relance` (09:00 UTC) : partenaire silencieux >24h → rappel ;
  client avec devis non choisi >24h → rappel.

### Inscription partenaires (PAS de nouvelle route)
Branche `category === "activities"` dans `/api/affiliate/register` existant
(+ champ sous-catégorie food_tours/boat_trips/hiking dans `SignupForm.tsx`),
module `src/lib/activity-signup.ts` (clone `car-rental-signup.ts` : check email,
insert partner, welcome email dédié).

### Admin
`/admin/activities` — clone server-first de `/admin/car-rental` (zéro JS client) :
KPI band (requests 7j/30j, taux de devis, taux de choix, délai médian 1er devis),
table requests (filtres silent/awaiting/declined), table partenaires
(invites reçues/devisées/gagnées). Auth cookie même pattern, module
`activity-admin-auth.ts`, même secret env que car (un seul admin : Kami).

### Intégrations existantes à étendre
- `sitemap.xml/route.ts` : +19 URLs (priorité 0.8, monthly), toutes locales.
- `vercel.json` : +2 crons.
- `email.ts` (Resend) et `car-offer-expiry.ts` (logique expiration) réutilisés tels quels.

## Modèle de données

Migration unique `supabase/migrations/20260709_activities_multi_quote.sql`.
Mêmes conventions que les migrations car (RLS off, accès service key via PostgREST,
Postgres 17 self-hosted VPS /opt/cretepulse-db).

### `activity_categories` (référence, 3 rows au lancement)
`slug` PK (food-tours | boat-trips | hiking), `name_en`, `sort_order`, `active`.
Extension future = INSERT, pas de code.

### `activity_partners` (clone `car_partners` + delta)
- Identité : `id`, `name`, `email`, `phone`, `company`, `created_at`, `active`.
- Delta : `category_slug` FK (un partenaire = une catégorie principale),
  `cities text[]` (parmi les 5 villes), `languages text[]` (langues des guides :
  en/fr/de/el/it).

### `activity_requests` (clone `car_requests` + delta produit)
- Commun : `id`, `created_at`, `status`, `client_email`, `client_name`, `locale`,
  `ip_hash`, snapshot `quoted_partner_id` / `quoted_price` / `quoted_at` posé à
  l'acceptation.
- Delta (8 dimensions vs car) :
  - `category_slug` + `city` (remplacent pickup/dropoff),
  - `activity_date` date (pas de plage),
  - `timeslot` (morning | afternoon | evening | flexible),
  - `adults int` + `children int` (remplacent l'âge conducteur),
  - `preferred_language` (langue de guide souhaitée),
  - `notes text` (régimes, mobilité, niveau rando).

### `activity_quote_invites` (clone strict `car_quote_invites`)
`request_id` FK, `partner_id` FK, `token`, `status`
(invited → quoted → chosen / not_chosen / declined), `quote_price`,
`quote_message`, `quote_inclusions text[]` (meals | transport | guide | gear),
`quoted_at`, `expires_at`.

**Règle prix : le devis est pour le groupe entier** (adultes+enfants connus du
partenaire), jamais par personne. Élimine toute ambiguïté.

## Parcours

### Wizard visiteur (`src/components/activities/ActivityWizard.tsx`)
Clone `CarRentalWizard.tsx` : grosses cartes cliquables, zéro champ texte avant
l'étape contact.
1. **Catégorie** (3 cartes) — sautée depuis `/activities/[category]/*`.
2. **Ville** (5 cartes) — sautée depuis `/activities/[category]/[city]`.
3. **Date + créneau + participants** — date picker, 4 cartes créneau,
   steppers adultes/enfants.
4. **Contact + préférences** — nom, email, langue de guide (préremplie depuis la
   locale), notes libres.

### Partenaire (`/activity-quote/[token]`)
Demande anonymisée (pas d'email client avant devis, comme car). Deux actions :
deviser (prix groupe, message, inclusions cochables) ou décliner.

### Client (`/activity-offer/[token]`)
Comparaison des devis côte à côte. Acceptation → snapshot + échange de coordonnées
par email, la suite se règle en direct entre client et partenaire. Zéro paiement
chez nous ; la donnée de matching en base rend la commission déclarative traçable
(facturation NovAI SASU post-paid).

## Monitoring et tests

`src/lib/activity-monitoring.ts` : module pur + tests (pattern `car-monitoring.ts`,
40 tests purs côté car, équivalent visé). KPIs calculés côté serveur, zéro état client.

## Gestion d'erreurs

Mêmes patterns que car : validation zod sur toutes les routes, tokens opaques
(pas d'ID séquentiels exposés), rate-limit IP hashé (jamais d'IP en clair en base),
emails Resend avec try/catch + log Sentry sans bloquer la réponse, invites expirées
refusées avec message clair.

## Roadmap (4 jours, pattern subagents : implémenteur + review spec + review qualité + fix loop)

- **J1** : migration SQL + libs data (`activity-partners-db`, `activity-quotes-db`,
  `activity-lead`, `activity-signup`) + tests purs.
- **J2** : API submit/quote/accept + rate-limit + emails 4 langues source + crons
  + `vercel.json`.
- **J3** : front (wizard + 19 pages, content.ts 22 locales généré + `/activity-offer`
  + `/activity-quote`) + sitemap.
- **J4** : admin cockpit + monitoring + branche `activities` dans
  `/api/affiliate/register` + QA bout en bout + deploy prod
  (`git push origin <branche>:main` — main = Production sur ce repo).

## Suite commerciale (hors spec technique)

Une fois le MVP live : réponse à Stelios (Bonnie & Clyde Urban Tours, food-tours
Chania) avec la page hub réelle comme preuve, puis prospection des 2 autres
catégories sur le même modèle que les agences car.
