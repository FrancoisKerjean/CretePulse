# Car Rental Direct — Devis : logique « gagnant » + UX de décision client

Date : 2026-07-05
Statut : design validé (approches + faits de réassurance + scope 1-4 approuvés par Kami)
Branche : `feat/car-quote-ux` (base = prod `3721b33`)

## Problème

Quatre trous sur le funnel devis de Car Rental Direct :

1. **« Gagnant » prématuré (modèle métier).** Le back-office affiche « Gagnant : X » dès qu'un
   loueur envoie son prix (statut `quoted`), avant décision du client. Le vrai gagnant n'existe
   qu'au statut `accepted`. Observé sur #8 : « Gagnant : RoadCrete · 310€ » alors que jamais
   accepté (finalement `lost`).

2. **Le client décide à l'aveugle (UX / conversion).** L'offre reçue (email + page `/car-offer`)
   contient seulement : prix nu, lieu, dates, type, bouton Accepter. Manque : identité du loueur
   (`partner_name` jamais affiché), inclusions, rappel des garanties CRD, clarté du prix
   (total vs /jour), étapes après acceptation. Offre anonyme + zéro réassurance = le client
   n'ose pas cliquer.

3. **Silence total si aucun loueur ne répond.** Au submit, le client ne reçoit **aucun accusé** :
   les emails partent aux loueurs, mais rien au client. Tant qu'un loueur n'a pas coté, le client
   attend un prix qui peut ne jamais venir (cf. #2 Guillaume, #3 Evangelia : restés `sent`, jamais
   servis, jamais prévenus).

4. **L'offre n'expire jamais.** Le lien d'acceptation n'a aucune expiration temporelle (le
   « expired » du code = seulement token déjà consommé). On peut accepter un prix pour des dates
   passées ; le loueur ne tiendra pas le prix.

## Décisions validées

- **Niveau d'enrichissement** : le loueur fournit modèle + inclusions en **optionnel** (prix seul
  obligatoire) ; réassurance côté client **systématique**.
- **Faits de réassurance affichables** (on n'affiche que le vrai, jamais de fausse promesse) :
  1. Pas de prépaiement en ligne (aucune carte requise pour réserver)
  2. Paiement à l'agence au retrait (espèces acceptées)
  3. Agence locale réelle en Crète (mise en relation directe)
  - **Exclu** : « annulation gratuite » universelle → uniquement si le loueur coche la case.

## A. Trou 1 — Logique « gagnant » (admin)

Fichier : `src/app/admin/car-rental/requests-table.tsx` (~L112-138).

Label dérivé du statut, plus de `quoted_by_partner_id` seul :

- statut `quoted` → **« Devis reçu de {name} · en attente du client »**
- statut `accepted` → **« Choisi par le client : {name} »**

`quoted_by_partner_id` reste la source du nom ; `row.status` (+ `accepted_at`) détermine le
libellé. Le compteur de tête `accepted` devient l'indicateur réel de conversions.

## B. Formulaire loueur — champs optionnels

Fichiers : `src/app/[locale]/car-quote/[token]/QuoteForm.tsx`, `.../page.tsx`,
`src/app/api/car-rental/quote/route.ts`.

- **Clarifier le champ prix** : libellé « prix **total** pour toute la période ».
- **Champ « Modèle proposé »** : texte court optionnel (ex. « VW Polo 2023 »).
- **Bloc « Inclus dans le prix »** : cases optionnelles, clés canoniques :
  `basic_insurance`, `unlimited_km`, `second_driver`, `free_cancellation`, `child_seat`,
  `airport_pickup`.
- Prix reste **seul champ obligatoire**.
- `POST /api/car-rental/quote` reçoit et persiste `carModel` (string|null) et `inclusions`
  (array de clés) dans la transition atomique `sent → quoted` existante (verrou first-come
  inchangé).

## C. Contenu client — email + page `/car-offer` (cohérents)

Fichiers : `src/lib/email.ts` (`sendCustomerQuoteEmail`, ~L453-495),
`src/app/[locale]/car-offer/[token]/page.tsx`.

Les deux surfaces affichent le même contenu enrichi :

- **Identité du loueur** : « Offre de **{partner_name}**, agence locale en Crète ».
- **Modèle proposé** (si fourni).
- **Inclus dans le prix** : liste lisible des cases cochées (rien si aucune).
- **Prix clarifié** : « **€{total} au total** · ~€{total/N}/jour sur {N} jours » (/jour calculé
  depuis les dates, jamais demandé au loueur).
- **Bloc réassurance** : les 3 faits validés (formulation factuelle, sans le mot « garantie »).
- **Étapes après « Accepter »** : 1) tu acceptes → 2) on transmet tes coordonnées à l'agence →
  3) l'agence te contacte pour finaliser, paiement au retrait.

## D. Trou 3 — Accusé client + notification si silence

Fichiers : `src/app/api/car-rental/submit/route.ts`, `src/lib/email.ts` (nouvelles fonctions),
cron Vercel (`vercel.json` + route `src/app/api/car-rental/cron-*`).

- **Accusé immédiat au submit** : nouvel email `sendCustomerRequestReceived` (envoyé une fois,
  juste après création de la demande). Contenu honnête : « Demande reçue. On interroge les agences
  locales, tu reçois un prix rapidement. Si aucune ne répond, on te prévient. »
- **Cas `email_failed`** (0 loueur invité sur la zone) : accusé adapté (« pas d'agence dispo sur
  ces critères pour l'instant, on revient vers toi »), pas de fausse attente.
- **Notification de silence** : cron périodique — si une demande est `sent` depuis > **24 h** sans
  devis, envoyer au client un email honnête (« aucune agence n'a encore répondu, on continue /
  désolé ») **une seule fois** (idempotence via `no_quote_notified_at`).

## E. Trou 4 — Expiration de l'offre

Fichiers : `src/app/api/car-rental/accept/route.ts`,
`src/app/[locale]/car-offer/[token]/page.tsx`.

- Expiration calculée (pas de nouvelle colonne) : `expiresAt = min(quoted_at + 72 h, date_from)`.
- Page `/car-offer` : si `now > expiresAt`, afficher « offre expirée » (distinct du token déjà
  consommé) au lieu du bouton Accepter.
- `POST /api/car-rental/accept` : rejeter l'acceptation si `now > expiresAt` (message expiré).
- Hors scope de ce chantier : la réouverture automatique d'un nouveau tour à l'expiration (juste
  bloquer + message pour l'instant).

## F. Data (Supabase)

Migration `supabase/migrations/` — colonnes ajoutées à `car_requests` (toutes nullable, zéro
impact sur l'existant) :

- `quoted_car_model TEXT NULL`
- `quoted_inclusions JSONB NULL` (tableau de clés canoniques)
- `no_quote_notified_at TIMESTAMPTZ NULL` (idempotence du cron de silence, trou 3)

Expiration (trou 4) = calculée depuis `quoted_at` + `date_from`, aucune colonne.

## i18n

Système déjà multilingue (EN/FR/DE/EL via `QUOTE_COPY`, `QUOTE_SUBJECT`). Toute nouvelle chaîne
ajoutée dans les 4 langues (accusé, notification silence, offre expirée, inclusions, étapes,
réassurance). Inclusions stockées comme **clés**, traduites à l'affichage.

## Suites séparées (hors ce chantier — tickets créés)

- **Trou 5 — relance client** si offre non acceptée (ex. J+1) : cron de relance dédié.
- **Trou 6 — anti-abus** : email client non vérifié + pas de rate-limit → devis dans le vide /
  spam loueurs. Validation + rate-limit, éventuel mini double opt-in (chantier sécu).
- **Question de fond — first-come vs meilleur prix** : le premier loueur verrouille (un seul
  prix, pas le moins cher). Décision de modèle (fenêtre multi-devis ?), à trancher à part.

## Autres exclusions (YAGNI)

- Pas de multi-devis, pas de notation/avis loueur, pas de photos de voiture.
- Pas de refonte du wizard `/car-rental` ni du verrou atomique `sent → quoted`.
- Pas de modification des emails de mise en relation post-acceptation.

## Validation

- `tsc` vert + `next build` **sans clé service** vert (conditions Preview — permis par le fix
  build-safe `3721b33`).
- Aperçu HTML des emails (accusé, devis enrichi, notification silence, expiration) ouvert à
  l'écran pour relecture visuelle.
- Preview Vercel : page `/car-offer` d'un devis test affiche identité loueur, modèle, inclusions,
  prix total + /jour, réassurance, étapes ; et « offre expirée » si simulée après 72 h.
- Admin : label « Devis reçu … » au statut `quoted`, « Choisi par le client … » au statut
  `accepted`.
- Test e2e manuel : demande test → accusé immédiat reçu → devis loueur (modèle + 2 inclusions) →
  email devis complet → `/car-offer` complète → accept → statut `accepted` + label admin correct.
