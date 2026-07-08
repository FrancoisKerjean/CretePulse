# Verticale /activities — design (clone car-rental direct)

Date : 2026-07-08 (révisé post-relecture adversariale contre le code car réel)
Statut : validé par Kami (brainstorm 4 sections, session 08/07) + corrections relecture appliquées
Référence : système car-rental direct (multi-devis, commission déclarative post-paid, zéro paiement en ligne)

**Principe directeur : clone strict.** Les noms de colonnes, patterns et garde-fous sont
IDENTIQUES au système car (mêmes noms `customer_*`, `quoted_by_partner_id`, `quote_token_hash`,
jsonb, etc.). Tout écart volontaire est marqué « DELTA ». Un implémenteur qui lit le code car
et cette spec doit voir une seule vérité.

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

Contenu i18n : `content.ts` par page, 22 locales. Le script car (`gen-car-content.mjs`)
était jetable et n'existe plus ; on réécrit un script jetable équivalent
(`scripts/gen-activity-content.mjs`) depuis le pattern du `content.ts` car final :
en/fr/de/el rédigés main, 18 autres traduits + vérification adversariale (diacritiques,
exactitude, voix de marque honnête, pas de garantie de revenus).
⚠️ Risque planning : 19 pages à contenu vs ~7 côté car, c'est le poste le plus lourd (J3).

### API
- `POST /api/activities/submit` — dans l'ordre, comme car :
  1. Rate-limit IP `SHA256(ip + sel)`, sel = `CAR_RL_SALT` réutilisé (un seul sel pour le
     site, documenté ici explicitement), 4/h + 12/j. **Comportement silencieux** : au-delà
     de la limite on renvoie un succès sans rien envoyer, la limite n'est jamais révélée.
     Le check passe AVANT tout travail coûteux.
  2. Validation par **validateur pur écrit main** (`validateActivityLead`, clone
     `validateCarLead`) avec **honeypot**. Pas de zod (pas une dépendance du projet).
  3. **Dédup** : même email + catégorie + ville + date sous 10 min → succès silencieux.
  4. Insert `activity_requests`, fan-out `activity_quote_invites` vers partenaires
     matchant `category_slug` + `city` (`cities @> [city]`, pattern `zone_ids`), en
     respectant `lead_routing` (direct = email au partenaire, relay = via Kami).
  5. Email Resend par partenaire avec lien `/activity-quote/[token]` — email **aveugle** :
     aucune coordonnée client.
  - **Aucun partenaire couvrant le combo** : ack client type `noAgency` (« on cherche pour
    vous ») + la request reste en base pour prospection.
- `POST /api/activities/quote` — partenaire : prix groupe + devise + message + inclusions,
  ou déclinaison (`declined_at`). Statut invite → `quoted`/`declined`, email client.
- `POST /api/activities/accept` — client : snapshot sur la request (voir modèle de données),
  invite gagnante → `chosen`, autres → `not_chosen` (aussi utilisé si le client décline
  toutes les offres), `sendConnectionEmails` (échange de coordonnées), token hash nullifié.
- Cron `GET /api/cron/activity-no-quote` (horaire) : request `status='sent'` >24h sans
  aucun devis et `no_quote_notified_at` null → **email au client** (« on relance pour
  vous ») + timestamp d'idempotence. (Clone exact du car ; pas de Telegram dans ce cron.)
- Cron `GET /api/cron/activity-relance` (09:00 UTC), garde-fous identiques au car :
  - partenaire `invited` >24h → rappel email, **1 relance max**, `relanced_at` posé AVANT
    l'envoi, token rotationné ;
  - client `status='quoted'` avec ≥1 devis réellement chiffré >24h → rappel, **2 relances
    max**, ≥24h entre relances, **jamais si `activity_date` est passée**.
  Logique pure dans `activity-quotes.ts` (clone `car-quotes.ts:41-62`), testable.

### Inscription partenaires (PAS de nouvelle route, PAS de nouvelle catégorie)
`CATEGORIES` (`affiliate.ts`) contient déjà `activity` et `tour`. **Décision : on n'ajoute
pas d'id `activities`** (collision à 3 synonymes). Les catégories existantes `activity` et
`tour` sont **interceptées** dans `/api/affiliate/register` (pattern branche `car_rental`)
vers le circuit devis : sous-catégorie obligatoire (food_tours | boat_trips | hiking |
other) ajoutée au `SignupForm.tsx` quand `activity`/`tour` est choisi ; `other` reste dans
le circuit affilié `/go/` actuel. Séquence clonée : `activityPartnerEmailExists` (409 si
dup) → `insertActivityPartner` → `notifyNewAffiliate` (notification admin) →
`sendActivitiesDirectWelcome`. Module `src/lib/activity-signup.ts` (clone
`car-rental-signup.ts`).
**Défauts inbound** (le formulaire n'a ni villes ni langues) : `cities` = les 5 villes
(clone du car qui donne `ALL_ZONE_IDS`), `languages` = `["en"]`. Affinage manuel en admin.
⚠️ Ne PAS dépendre de `outreach_status` (colonne présente en base VPS mais absente des
migrations du repo) ; si besoin, la migrer proprement dans notre migration.

### Admin
`/admin/activities` — clone server-first de `/admin/car-rental` (zéro `use client`) :
KPI band (requests 7j/30j, taux de devis, taux de choix, délai médian 1er devis — tous
présents dans le `CockpitKpis` car), table requests (filtres silent/awaiting/declined),
table partenaires (invites reçues/devisées/gagnées), **édition outcome/commission**
(cœur du modèle déclaratif, voir bloc commissions du modèle de données).
Auth : module `activity-admin-auth.ts`, **même variable env `CAR_ADMIN_SECRET`**
(≥24 caractères, un seul admin : Kami), entrée `?key=`, cookie httpOnly dédié
`activity_admin` avec jeton HMAC dérivé (label `activity-admin-cookie-v1`), 30 jours,
comparaison constant-time. **Pas de middleware** : chaque page/action appelle
`isActivityAdmin()`.

### Intégrations existantes à étendre
- `sitemap.xml/route.ts` : +19 entrées, chacune une URL canonique `/en` avec alternates
  hreflang 22 locales (pattern existant). Hubs et catégories `monthly, 0.8` ;
  page mère `/activities` en `weekly, 0.8` via `STATIC_PAGES` (comme `/car-rental`).
- `vercel.json` : +2 crons.
- `email.ts` (Resend, `hello@crete.direct`) : nouveaux senders ajoutés inline.
  **Localisation réelle du pattern car** : emails client en 4 langues (en/fr/de/el,
  maps inline, fallback en) ; emails partenaire **anglais uniquement** ; résumé Kami
  en français. On clone tel quel — ne pas traduire les emails partenaires.
- `car-offer-expiry.ts` réutilisé tel quel : signature générique `(quotedAt, dateFrom)`,
  expiration = min(devis + 72h, minuit du jour de l'activité) — on passe `activity_date`.

## Modèle de données

Migration unique `supabase/migrations/20260709_activities_multi_quote.sql`.
Mêmes conventions que les migrations car (RLS off, accès service key via PostgREST,
Postgres 17 self-hosted VPS /opt/cretepulse-db). Noms de colonnes = identiques au car.

### `activity_categories` (référence, 3 rows au lancement)
`slug` PK (food-tours | boat-trips | hiking), `name_en`, `sort_order`, `active`.
Extension future = INSERT, pas de code.

### `activity_partners` (clone `car_partners` + delta)
- Clone : `id`, `name`, `email UNIQUE`, `phone`, `whatsapp`,
  `commission numeric DEFAULT 0.10`, `lead_routing text 'direct'|'relay' DEFAULT 'direct'`,
  `active`, `created_at`.
- DELTA : `category_slug` FK (un partenaire = une catégorie principale),
  `cities text[]` + index GIN (clone du pattern `zone_ids text[]`),
  `languages text[]` (langues des guides : en/fr/de/el/it — vrai delta, pas d'équivalent car).

### `activity_requests` (clone `car_requests` + delta produit)
- Clone : `id`, `created_at`, `status`, `customer_name`, `customer_email`,
  `customer_phone`, `locale`, `source`, `ip_hash` (+ index `(ip_hash, created_at)`),
  `no_quote_notified_at`.
- Snapshot à l'acceptation (noms car exacts) : `quoted_by_partner_id`, `quoted_price`,
  `quoted_currency`, `quoted_details` (équivalent `quoted_car_model` : titre de l'offre),
  `quoted_inclusions jsonb`, `quoted_at`, `accepted_at`, `partner_name` / `partner_email`
  dénormalisés, `status = 'accepted'`, `accept_token_hash` nullifié.
- **Bloc commissions admin** (clone `20260705_car_admin.sql`, cœur de la facturation
  NovAI) : `outcome`, `outcome_at`, `final_amount_eur`, `commission_eur`,
  `commission_paid_at`, `admin_note`.
- DELTA produit (8 dimensions vs car) :
  - `category_slug` + `city` (remplacent pickup/dropoff/zone_id),
  - `activity_date` date (pas de plage),
  - `timeslot` (morning | afternoon | evening | flexible),
  - `adults int` + `children int` (remplacent l'âge conducteur),
  - `preferred_language` (langue de guide souhaitée),
  - `notes text` (régimes, mobilité, niveau rando). ⚠️ Montrées telles quelles au
    partenaire (comme le `note` car) : le formulaire précise de ne pas y mettre de
    coordonnées personnelles.

### `activity_quote_invites` (clone strict `car_quote_invites`)
`request_id` FK, `partner_id` FK, `quote_token_hash` (**token stocké hashé**, index
unique — jamais en clair), `status`
(`invited → quoted → chosen / not_chosen` ; `declined` depuis `invited`),
`quote_price`, `quote_currency`, `quote_message`, `quote_inclusions jsonb`
(meals | transport | guide | gear), `quoted_at`, `declined_at`, `relanced_at`,
`expires_at`.

**Règle prix : le devis est pour le groupe entier** (adultes+enfants connus du
partenaire), jamais par personne. Élimine toute ambiguïté.

## Parcours

### Wizard visiteur (`src/components/activities/ActivityWizard.tsx`)
Clone `CarRentalWizard.tsx` : grosses cartes cliquables, champs texte repoussés au
maximum vers l'étape contact (le car a un seul input texte optionnel avant contact,
le numéro de vol ; activities n'en a aucun avant l'étape 4 hors `notes`).
1. **Catégorie** (3 cartes) — sautée depuis `/activities/[category]/*`.
2. **Ville** (5 cartes) — sautée depuis `/activities/[category]/[city]`.
   **Les combos catégorie×ville sans partenaire actif sont grisés** (clone
   `servedZoneIds()`), avec fallback « demandez quand même » vers le parcours noAgency.
3. **Date + créneau + participants** — date picker, 4 cartes créneau,
   steppers adultes/enfants.
4. **Contact + préférences** — nom, email, langue de guide (préremplie depuis la
   locale), notes libres.
⚠️ Le skip car existant ne saute qu'un niveau (`?pickup=` → étape 2). Le **double skip**
(catégorie+ville → étape 3) est du code NOUVEAU, à tester spécifiquement.

### Partenaire (`/activity-quote/[token]`)
La page ne sélectionne AUCUN champ coordonnées client (clone exact : ni nom, ni email,
ni téléphone — seules la demande et les `notes` sont visibles). Deux actions : deviser
(prix groupe + devise, message, inclusions cochables) ou décliner.

### Client (`/activity-offer/[token]`)
Comparaison des devis côte à côte. **Les coordonnées ne sont échangées qu'à
l'acceptation** (`sendConnectionEmails`), jamais avant. Acceptation → snapshot + emails
croisés, la suite se règle en direct entre client et partenaire. Zéro paiement chez
nous ; la donnée de matching + le bloc commissions rendent la facturation déclarative
NovAI SASU traçable en admin.

## Monitoring et tests

`src/lib/activity-monitoring.ts` : module pur + tests via script
`scripts/check-activity-monitoring.mjs` (pattern car : 48 tests purs passants,
équivalent visé). KPIs calculés côté serveur, zéro état client.
Modules purs testés : monitoring, relances (`activity-quotes.ts`), validateur lead,
expiry (déjà couvert côté car).

## Gestion d'erreurs

Mêmes patterns que car : **validateurs purs écrits main** (pas de zod), tokens opaques
stockés hashés (pas d'ID séquentiels exposés), rate-limit IP hashé silencieux (jamais
d'IP en clair en base), honeypot + dédup, emails Resend avec try/catch +
**`console.error`** sans bloquer la réponse (pas de Sentry dans le flux car ; on clone),
invites expirées refusées avec message clair.

## Roadmap (4 jours, pattern subagents : implémenteur + review spec + review qualité + fix loop)

- **J1** : migration SQL + libs data (`activity-partners-db`, `activity-quotes-db`,
  `activity-lead` avec validateur+honeypot, `activity-signup`) + tests purs.
- **J2** : API submit (rate-limit, dédup, fan-out, lead_routing, noAgency) /
  quote / accept + emails (client 4 langues, partenaire EN) + 2 crons + `vercel.json`.
- **J3** (jour à risque, contenu) : wizard (dont double skip, nouveau) + 19 pages
  (content.ts 22 locales via script gen réécrit) + `/activity-offer` + `/activity-quote`
  + sitemap.
- **J4** : admin cockpit (KPI + outcome/commission) + monitoring + interception
  `activity`/`tour` dans `/api/affiliate/register` + QA bout en bout + deploy prod.
  **Déploiement selon la convention du repo : merge vers `master` puis
  `git push origin master:main`** (jamais une branche feat directement sur main).

## Suite commerciale (hors spec technique)

Une fois le MVP live : réponse à Stelios (Bonnie & Clyde Urban Tours, food-tours
Chania) avec la page hub réelle comme preuve, puis prospection des 2 autres
catégories sur le même modèle que les agences car.
