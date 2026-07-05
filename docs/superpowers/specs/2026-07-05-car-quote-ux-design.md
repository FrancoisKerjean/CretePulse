# Car Rental Direct — Devis : logique « gagnant » + UX de décision client

Date : 2026-07-05
Statut : design validé (approches + faits de réassurance approuvés par Kami)
Branche : `feat/car-quote-ux` (base = prod `3721b33`)

## Problème

Deux trous identifiés sur le funnel devis de Car Rental Direct :

1. **« Gagnant » prématuré (modèle métier).** Le back-office affiche « Gagnant : X » dès qu'un
   loueur envoie son prix (statut `quoted`), avant toute décision du client. Le vrai gagnant
   n'existe qu'au statut `accepted` (le client a cliqué « Accepter »). Observé sur la demande #8 :
   « Gagnant : RoadCrete · 310€ » alors que `quoted` + jamais accepté (finalement `lost`).

2. **Le client décide à l'aveugle (UX / conversion).** L'offre reçue par le client (email +
   page `/car-offer`) contient uniquement : prix nu, lieu, dates, type de voiture, bouton
   Accepter. Il manque tout ce qui permet de décider et de faire confiance :
   - l'identité du loueur (`partner_name` existe en base mais **n'est jamais affichée**) ;
   - ce qui est inclus dans le prix (assurance, km, annulation…) ;
   - le rappel des garanties CRD (pas de prépaiement en ligne, paiement au retrait) ;
   - la clarté du prix (total vs par jour) ;
   - les étapes concrètes après l'acceptation.
   Conséquence : offre anonyme + zéro réassurance = le client n'ose pas cliquer.

## Décisions validées

- **Niveau d'enrichissement** : le loueur fournit modèle + inclusions en **optionnel** (le prix
  reste le seul champ obligatoire) ; la réassurance côté client est **systématique**.
- **Faits de réassurance affichables** (validés — on n'affiche que le vrai, jamais de fausse
  promesse, cf. brand Kairos) :
  1. Pas de prépaiement en ligne (aucune carte requise pour réserver)
  2. Paiement à l'agence au retrait (espèces acceptées)
  3. Agence locale réelle en Crète (mise en relation directe)
  - **Exclu** : « annulation gratuite » comme promesse universelle → dépend du loueur, affichée
    uniquement si le loueur coche la case correspondante.

## A. Trou 1 — Logique « gagnant » (admin)

Fichier : `src/app/admin/car-rental/requests-table.tsx` (~L112-138).

Le label dérive du statut de la demande, plus de `quoted_by_partner_id` seul :

- statut `quoted` (devis envoyé, pas encore accepté) →
  **« Devis reçu de {name} · en attente du client »** (ton neutre, pas « gagnant »)
- statut `accepted` (client a accepté) →
  **« Choisi par le client : {name} »** (le vrai gagnant)

`quoted_by_partner_id` reste la source du nom ; c'est `row.status` (et `accepted_at`) qui
détermine le libellé. Le compteur de tête `accepted` devient l'indicateur réel de conversions.

## B. Formulaire loueur — champs optionnels

Fichiers : `src/app/[locale]/car-quote/[token]/QuoteForm.tsx`, `.../page.tsx`,
`src/app/api/car-rental/quote/route.ts`.

- **Clarifier le champ prix** : libellé explicite « prix **total** pour toute la période »
  (lève l'ambiguïté total vs /jour).
- **Nouveau champ « Modèle proposé »** : texte court optionnel (ex. « VW Polo 2023 »).
- **Nouveau bloc « Inclus dans le prix »** : cases à cocher optionnelles, clés canoniques :
  `basic_insurance` (assurance de base), `unlimited_km` (km illimités),
  `second_driver` (2ᵉ conducteur), `free_cancellation` (annulation gratuite),
  `child_seat` (siège enfant), `airport_pickup` (prise en charge aéroport).
- Le prix reste **seul champ obligatoire** ; modèle et inclusions n'empêchent jamais l'envoi.
- L'endpoint `POST /api/car-rental/quote` reçoit et persiste `carModel` (string|null) et
  `inclusions` (array de clés, éventuellement vide) dans la même transition atomique
  `sent → quoted` déjà en place (aucun changement du verrou first-come).

## C. Contenu client — email + page `/car-offer` (cohérents)

Fichiers : `src/lib/email.ts` (`sendCustomerQuoteEmail`, ~L453-495),
`src/app/[locale]/car-offer/[token]/page.tsx`.

Les deux surfaces affichent le même contenu enrichi :

- **Identité du loueur** : « Offre de **{partner_name}**, agence locale en Crète ».
- **Modèle proposé** (si fourni).
- **Inclus dans le prix** : liste lisible des cases cochées (rien affiché si aucune).
- **Prix clarifié** : « **€{total} au total** · ~€{total/jours}/jour sur {N} jours » (le /jour est
  **calculé** à partir des dates, jamais demandé au loueur).
- **Bloc réassurance** : les 3 faits validés (pas de prépaiement en ligne · paiement au retrait,
  cash accepté · agence locale réelle). Formulation factuelle, sans le mot « garantie ».
- **Étapes après « Accepter »** : 1) tu acceptes → 2) on transmet tes coordonnées à l'agence →
  3) l'agence te contacte pour finaliser, **paiement au retrait**.

## D. Data (Supabase)

Nouvelle migration `supabase/migrations/` — colonnes ajoutées à `car_requests` :

- `quoted_car_model TEXT NULL`
- `quoted_inclusions JSONB NULL` (tableau de clés canoniques, ex. `["basic_insurance","unlimited_km"]`)

Colonnes nullable → aucune donnée existante impactée ; les demandes déjà `quoted` restent valides
(model/inclusions à `null`, affichage dégradé propre).

## i18n

Système déjà multilingue (EN/FR/DE/EL via `QUOTE_COPY`, `QUOTE_SUBJECT`). Toute nouvelle chaîne
est ajoutée dans les 4 langues. Les inclusions sont stockées comme **clés** et traduites à
l'affichage (email, page client, et libellés du formulaire loueur).

## Hors scope (YAGNI)

- Pas de multi-devis : le modèle first-come (un seul loueur répond) est conservé tel quel.
- Pas de notation / avis loueur, pas de photos de voiture.
- Pas de refonte du wizard `/car-rental` ni du verrou atomique `sent → quoted`.
- Pas de modification du flow d'acceptation (`POST /api/car-rental/accept`) ni des emails de mise
  en relation post-acceptation.

## Validation

- `tsc` vert + `next build` **sans clé service** vert (conditions Preview Vercel — le fix
  build-safe `3721b33` le permet déjà).
- Aperçu HTML de l'email client ouvert à l'écran pour relecture visuelle (réflexe Kami).
- Preview Vercel de la branche : page `/car-offer` d'un devis test affiche identité loueur,
  modèle, inclusions, prix total + /jour, réassurance, étapes.
- Admin : label « Devis reçu … » au statut `quoted`, « Choisi par le client … » au statut
  `accepted`.
- Test e2e manuel : demande test → devis loueur avec modèle + 2 inclusions → email client reçu →
  page `/car-offer` complète → accept → statut `accepted` + label admin correct.
