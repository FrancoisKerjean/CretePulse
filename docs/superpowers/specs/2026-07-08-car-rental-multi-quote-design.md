# Car Rental Direct — modèle multi-devis (design)

**Date** : 2026-07-08
**Statut** : design validé (brainstorming Kami), en attente relecture avant plan d'implémentation.

## Objectif

Remplacer le modèle **first-come** (le premier loueur qui soumet son prix gagne le lead ; le
client reçoit une seule offre) par un modèle **multi-devis** :

1. **Client** : reçoit toutes les offres des loueurs de sa zone et **choisit** celle qu'il veut.
2. **Kami (admin)** : voit dans `/admin/car-rental` l'état de chaque demande — quels loueurs ont
   chiffré, à quel prix, et **quelle offre le client a choisie** (s'il a choisi).

But métier : le first-come récompense la vitesse de réponse du loueur, pas le prix/la qualité.
Il plafonne aussi la valeur de l'offre (activer plus de loueurs par zone n'apporte rien tant que
seul le plus rapide gagne). Le multi-devis livre « meilleur prix / choix client » et donne un
sens à la croissance du parc loueurs (les 61 recrutés dormants).

**Réalité de volume assumée** : aujourd'hui ~2 loueurs actifs, la plupart des zones n'en ont
qu'un → souvent 1 seul devis. La valeur comparaison ne se matérialise qu'avec plus de loueurs
actifs. On construit le rail avant le volume, sciemment.

## État actuel (à modifier)

- `car_requests` : porte le devis **gagnant en dur** (`quoted_price`, `quoted_car_model`,
  `quoted_inclusions`, `quoted_currency`, `quoted_at`, `quoted_by_partner_id`) +
  `accept_token_hash` (token client, généré **au 1er devis**). Modèle mono-offre.
- `car_quote_invites` : 1 ligne par loueur invité (`request_id`, `partner_id`,
  `quote_token_hash`). Sert au loueur à soumettre. Pas de champ de prix aujourd'hui.
- `/api/car-rental/quote` : **verrou atomique first-come** (`.eq(status,'sent')`) → le premier
  écrit `quoted_*` sur `car_requests`, génère `accept_token`, email offre au client. Les suivants
  sont forclos (`already:true`).
- `/api/car-rental/accept` : le client accepte via `accept_token_hash` → `status=accepted`,
  révèle les coords du loueur gagnant.
- `/car-offer/[token]` : page client, affiche **une** offre + bouton Accepter.
- `/admin/car-rental` : liste demandes (`AdminRequest`), loueurs, stats, issue (rented/lost),
  commissions. Lit `quoted_*` = le gagnant unique.

## Modèle cible

### 1. Data model — les devis descendent sur `car_quote_invites`

Migration `supabase/migrations/20260708_car_multi_quote.sql` :

```sql
ALTER TABLE car_quote_invites
  ADD COLUMN IF NOT EXISTS status           text NOT NULL DEFAULT 'invited',
    -- 'invited' -> 'quoted' -> 'chosen' | 'not_chosen' ; ou 'declined' (loueur se désiste)
  ADD COLUMN IF NOT EXISTS quote_price      numeric,
  ADD COLUMN IF NOT EXISTS quote_currency   text,
  ADD COLUMN IF NOT EXISTS quote_car_model  text,
  ADD COLUMN IF NOT EXISTS quote_inclusions text,
  ADD COLUMN IF NOT EXISTS quoted_at        timestamptz,
  ADD COLUMN IF NOT EXISTS declined_at      timestamptz,  -- loueur : « je ne peux pas »
  ADD COLUMN IF NOT EXISTS relanced_at      timestamptz;  -- relance loueur envoyée (1×)

CREATE INDEX IF NOT EXISTS idx_car_quote_invites_request ON car_quote_invites (request_id);

ALTER TABLE car_requests
  ADD COLUMN IF NOT EXISTS client_relanced_at   timestamptz,  -- dernière relance client
  ADD COLUMN IF NOT EXISTS client_relance_count int NOT NULL DEFAULT 0;
-- car_requests.status accepte en plus : 'declined_by_client'
```

- `car_quote_invites.status` = source unique de l'état d'un loueur sur une demande :
  `invited` (défaut) → `quoted` (a chiffré) → `chosen` / `not_chosen` (après choix client) ;
  ou `declined` (loueur s'est désisté). Remplace tout booléen séparé.
- `car_requests.accept_token_hash` : désormais généré **à la création de la demande** (dans
  `submit`), pas au 1er devis. Il identifie la page offres du client, indépendante d'un devis
  précis.
- Les colonnes `quoted_*` de `car_requests` sont **conservées** et re-remplies au moment du CHOIX
  (snapshot du devis choisi) → l'admin, les commissions et l'issue existants continuent de
  fonctionner sans réécriture (rétro-compat). `quoted_by_partner_id` = le loueur choisi.
- `car_requests.status` accepte une valeur de plus : `declined_by_client` (le client a cliqué
  « aucune offre ne me convient »).

### 2. Soumission loueur — `/api/car-rental/quote`

- **Retirer** le verrou `.eq(status,'sent')`.
- Le loueur écrit son devis sur **sa** ligne `car_quote_invites` (résolue par `quote_token_hash`) :
  `quote_price`, `quote_currency`, `quote_car_model`, `quote_inclusions`, `quoted_at=now()`.
- Idempotence : un loueur qui re-soumet met à jour son propre devis (pas de doublon).
- `car_requests.status` : passe de `sent` à `quoted` au 1er devis reçu (inchangé côté sémantique
  admin), reste `quoted` ensuite.
- `car_quote_invites.status` : `invited` → `quoted`.
- Après écriture : **email au client** (cf 3) + retour loueur « Devis reçu, le client compare les
  offres, on te prévient si tu es choisi ».
- Garde : si la demande est déjà `accepted` / `declined_by_client` / expirée → refuser proprement
  (HTTP 409/410), le loueur voit « demande déjà clôturée ».
- **Désistement loueur** : la page `/car-quote/[token]` porte un bouton **« Je ne peux pas
  répondre à cette demande »** → POST `/api/car-rental/quote?decline=1` (même token) → invite
  `status='declined'`, `declined_at=now()`. Le loueur voit « Noté, merci ». Un loueur désisté
  n'est plus relancé (cf 7) et n'apparaît pas dans les offres client.

### 3. Notification client — relance à chaque devis

- À **chaque** devis reçu, email au client :
  - 1er devis : « Votre première offre est arrivée — d'autres peuvent suivre. Comparez et
    choisissez ici : [lien `/car-offer/<accept_token>`] ».
  - Suivants : « Une nouvelle offre est arrivée pour votre location — comparez ici : [lien] ».
- Tous les emails pointent vers la **même** page offres.
- Emails HTML brandés (réutiliser `kalimeraShell` / le style de `sendCustomerQuoteEmail`).

### 4. Page offres — `/car-offer/[token]`

- Refonte : de « 1 offre » à **liste de toutes les offres reçues** pour cette demande
  (`car_quote_invites` où `quoted_at IS NOT NULL`, joint au nom du loueur).
- Chaque carte : loueur, modèle, prix total + ~€/jour (calc existant), inclusions, réassurance
  (aucun prépaiement / paiement au retrait / vraie agence locale — copy existante
  `car-offer-copy.ts`), bouton **Choisir**.
- Tri : par prix croissant (aligne « meilleur prix »).
- États : aucune offre encore (« vos offres arrivent »), demande expirée (page « expirée », copy
  existante `car-offer-expiry.ts`), demande déjà choisie (montre le choix, boutons désactivés).
- i18n en/fr/de/el via module partagé.

### 5. Choix client — `/api/car-rental/accept`

- Payload : `token` (client) + `invite_id` (l'offre choisie).
- Garde : demande non `accepted`, non expirée, l'invite appartient bien à la demande et a un devis.
- Transaction :
  - `car_quote_invites` : l'invite choisie `status='chosen'`, les autres invites ayant chiffré
    `status='not_chosen'` (les `declined` restent `declined`).
  - `car_requests` : `status=accepted`, `accepted_at=now()`, snapshot du devis choisi dans
    `quoted_*` + `quoted_by_partner_id` (rétro-compat admin/commissions), `accept_token_hash=null`
    (consommé).
- Emails :
  - Loueur **choisi** : coords client + « vous avez été choisi » (réutilise le flux accept actuel).
  - Loueurs **non choisis** (`not_chosen`) : email poli « pas retenu cette fois » (nouveau template
    court).
- Retour client : coords du loueur choisi (page « c'est réservé, voici votre loueur »).
- **Désistement client** : la page offres porte un bouton **« Aucune de ces offres ne me
  convient »** → POST `/api/car-rental/accept?decline=1` (token client) → `car_requests.status=
  'declined_by_client'`, `accept_token_hash=null`. Stoppe les relances client. Les loueurs ayant
  chiffré passent `not_chosen`, **sans** email « pas retenu » (l'email loser ne part QUE sur un vrai
  choix ; sur un décline global on n'ennuie pas les loueurs). Le client voit « Noté, pas de souci ».

### 6. Admin — `/admin/car-rental`

- `AdminRequest` + la couche de lecture : joindre les `car_quote_invites` (devis + `chosen`) de
  chaque demande.
- `requests-table.tsx` : par demande, afficher la **liste des devis reçus** (loueur + prix), le
  choix du client **surligné** (badge « choisi par le client »). Demande sans devis = comme
  aujourd'hui.
- `partnerStats` : `won` compte désormais `car_quote_invites.chosen=true` (au lieu de
  `quoted_by_partner_id` — équivalent car snapshot). `invites` inchangé.
- Le reste (issue rented/lost, commission, admin_note) inchangé : s'appuie sur le snapshot
  `quoted_*` du choix.
- Nouvelles colonnes visibles par demande : loueurs `declined` (badge « ne peut pas »), statut
  `declined_by_client`, dernière relance (client + loueurs).

### 7. Relances automatiques — deux côtés, avec opt-out explicite

Objectif : plus de trou noir silencieux. Chaque partie qui ne répond pas est relancée une fois ;
chaque partie a un bouton pour se désister proprement (ce qui coupe ses relances).

**Endpoint cron** `/api/cron/car-relance` (auth `Bearer CRON_SECRET`, idempotent, pattern
`/api/cron/car-no-quote` existant). Cron Vercel quotidien (ou 2×/j). Deux passes :

- **Relance loueur** : pour chaque `car_quote_invites` où `status='invited'` (ni chiffré ni
  désisté) ET la demande est ouverte (`status IN ('sent','quoted')`, non expirée) ET
  `created_at < now()-24h` ET `relanced_at IS NULL` → email loueur « Un client attend votre devis
  (lien) ou dites-nous que vous ne pouvez pas » + `relanced_at=now()`. **1 seule relance/loueur**.
- **Relance client** : pour chaque `car_requests` où `status='quoted'` (≥1 offre reçue) ET non
  `accepted`/`declined_by_client` ET non expirée ET
  (`client_relanced_at IS NULL` OU `client_relanced_at < now()-24h`) ET `client_relance_count < 2`
  → email client « Vos offres vous attendent : choisissez, ou dites-nous qu'aucune ne convient
  (lien) » + `client_relanced_at=now()`, `client_relance_count += 1`. **Max 2 relances client**.

Distinction avec l'existant : `send_relance.py` (VPS) relance les loueurs sur le silence de
**recrutement** (rejoindre le réseau). Ici c'est la relance **par demande** (répondre à un lead).
Les deux coexistent, cibles disjointes.

## Isolation / unités

- **Data** : `car-quote.ts` (tokens, inchangé) + un nouveau `car-quotes-db.ts` (lectures :
  `quotesForRequest(requestId)`, `quotesForClient(tokenHash)`) — I/O isolée, testable.
- **Pur** : `car-admin.ts` (stats) + `car-offer-copy.ts` (copy) réutilisés, ajustés à la marge.
- **Routes** : `quote` (soumission), `accept` (choix) — orchestration I/O.
- **Vues** : `/car-offer/[token]` (client), `requests-table.tsx` (admin).

## Edge cases

- **0 devis à l'expiry** : demande reste `sent`/`quoted` sans choix ; cron silence >24h existant
  (`/api/cron/car-no-quote`) prévient déjà Kami. Inchangé.
- **Client choisit pendant qu'un devis arrive** : le choix clôt la demande (`accepted`) ; un devis
  tardif est refusé (409). Acceptable.
- **1 seul loueur/zone** : 1 devis → page à 1 carte → comportement ≈ actuel. OK.
- **Loueur re-soumet un prix** : met à jour son devis tant que la demande n'est pas clôturée.
- **Loueur désisté puis veut chiffrer** : `declined` est réversible tant que la demande est ouverte
  (re-soumettre un prix repasse `quoted`). Sinon 409.
- **Tous les loueurs désistés** : demande sans offre → traitée comme 0 devis (cron silence).
- **Client décline puis un loueur chiffre** : demande `declined_by_client` = fermée, devis tardif
  refusé (409).
- **Relance vs désistement** : dès qu'un loueur `declined` ou une demande `declined_by_client`, la
  relance correspondante ne part plus (garde dans le cron). Pas de relance après clôture/expiry.
- **Zone sans loueur actif** : inchangé (accusé no-agency existant).

## Tests

- `check-car-lead.mjs` : inchangé (validation pure).
- Nouveau `check-car-quotes.mjs` (pur) : tri par prix, sélection du choix, transitions de statut
  (`invited→quoted→chosen/not_chosen`, `declined`), gardes déjà-accepté / décliné / expiré,
  éligibilité relance (loueur invited >24h non relancé ; client quoted count<2).
- `tsc --noEmit` + `check-car-admin` (stats `won` via `status='chosen'`).
- Test e2e contrôlé en prod (2 loueurs test, 2 devis, 1 désistement loueur, choix client, +
  décline client sur une 2e demande test) puis nettoyage — **jamais** de vraie demande live
  (spamme les vrais loueurs, leçon 04/07).

## Hors scope (volontaire)

- Comparateur « fancy » (filtres, tri multi-critères) : la liste triée par prix suffit.
- Fenêtre de collecte temporisée : le client choisit quand il veut avant l'expiry 72h.
- Merchant-of-record / paiement en ligne : gardé en réserve gros volumes.
