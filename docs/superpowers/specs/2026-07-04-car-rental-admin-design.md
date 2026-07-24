# Back-office Car Rental Direct — `/admin/car-rental` (crete.direct)

Date : 2026-07-04 · Statut : design validé par Kami (brainstorming 04/07,
révisé le même jour après découverte du lot appel d'offres en prod)

## Problème

Le système Car Rental Direct est désormais un **appel d'offres automatisé**
(lot `origin/main` jusqu'à `baaf543`) : demande client → fan-out à tous les
loueurs actifs de la zone (`car_quote_invites`, un jeton par loueur) → le
premier prix soumis gagne (`car_requests.status` : `sent → quoted → accepted`)
→ mise en relation automatique. Le registre des loueurs vit en DB
(`car_partners` : zones, commission par partenaire, `lead_routing`
direct/relay, `active`, plus `outreach_status` côté recrutement VPS).

Il n'existe **aucune interface graphique** : ni vue des demandes et de leur
cycle, ni suivi de ce qui se passe **après `accepted`** (la location a-t-elle
réellement eu lieu ? quel montant final ? la commission a-t-elle été
encaissée ?), ni gestion visuelle des partenaires. Tout se fait en SQL sur le
VPS et par emails.

## Solution

Une page privée server-rendered `/admin/car-rental` dans cretepulse-build,
deux vues (Demandes / Partenaires) : cycle automatique en lecture, saisie de
l'**issue** post-accepted, commissions calculées au taux du partenaire,
gestion du registre loueurs. Pas de nouveau service, pas de dépendance.

## 1. Accès et sécurité

- Nouvelle env Vercel : `CAR_ADMIN_SECRET` (valeur générée, longue).
- Première visite : `/admin/car-rental?key=<secret>` → si la clé correspond,
  pose un cookie `car_admin` httpOnly/secure/sameSite=lax, 30 jours (valeur =
  le secret, comparé côté serveur à chaque requête).
- Sans clé ni cookie valide : `notFound()` (404 — on ne révèle pas l'existence
  de la page, pas d'écran de login).
- Chaque **server action** revalide le cookie avant toute écriture.
- Page `noindex, nofollow`, hors arbre `[locale]` → absente du sitemap.
- **Middleware** : le matcher next-intl (`src/middleware.ts`) n'exclut pas
  `admin` → ajouter `admin` aux exclusions (comme `api`), sinon la page est
  capturée par le routing i18n.

## 2. Données — migration `supabase/migrations/20260705_car_admin.sql`

Le cycle automatique existant (`status` sent/quoted/accepted/email_failed,
`quoted_price`, `quoted_by_partner_id`, `quoted_at`, `accepted_at`) n'est
**pas modifié**. On ajoute à `car_requests` uniquement le suivi d'issue :

| Colonne | Type | Rôle |
|---|---|---|
| `outcome` | text, NULL | `rented` (location effectuée) ou `lost` (pas aboutie) |
| `outcome_at` | timestamptz | horodatage de la saisie d'issue |
| `final_amount_eur` | numeric | montant final réel (pré-rempli avec `quoted_price`) |
| `commission_eur` | numeric | **snapshot** de la commission à la saisie de l'issue (montant × taux du partenaire ce jour-là) — l'édition ultérieure du taux ne réécrit pas l'historique facturable |
| `commission_paid_at` | timestamptz, NULL | NULL = due, non-NULL = encaissée |
| `admin_note` | text | note libre |

`car_partners` : aucune colonne ajoutée (tout existe déjà : `active`,
`zone_ids`, `commission`, `lead_routing`). La colonne `outreach_status`
(contacted/replied/declined) a été ajoutée directement en SQL sur le VPS et
n'est pas versionnée dans le repo : la page la lit si présente, l'ignore
sinon (select tolérant).

Livraison : SQL versionné + **exécution manuelle sur le VPS** (`docker exec`
psql `/opt/cretepulse-db` + `NOTIFY pgrst, 'reload schema'` — inclus dans le
fichier). La page tolère l'absence des colonnes avant migration (erreur
propre, pas de crash build).

## 3. Interface (une page, deux vues, mobile-friendly)

Navigation par onglets (`?tab=requests` défaut / `?tab=partners`).
Style Tailwind du repo, sobre, aucun composant lourd. Sur mobile les tableaux
passent en cartes empilées. Pagination simple 50/page.

### Vue Demandes
- **Bandeau** : compteurs par `status` (sent/quoted/accepted + email_failed en
  alerte), compteurs d'issue (rented/lost), **commission due**
  (Σ `commission_eur` snapshotée, fallback `final_amount_eur × commission` du partenaire gagnant, sur
  `outcome='rented'` et `commission_paid_at IS NULL`) et **commission
  encaissée** (idem avec `commission_paid_at NOT NULL`).
- **Tableau** récent → ancien : date, client (nom/email/tél), pickup, dates +
  heures + vol, véhicule, pax, assurance/paiement, nb de loueurs invités
  (count `car_quote_invites`), statut auto (badge), partenaire gagnant,
  `quoted_price`, issue, montant final, commission calculée, note.
- **Filtres** : statut, issue, partenaire gagnant.
- **Par demande (écritures)** : boutons `rented` / `lost` (avec champ montant
  final pré-rempli au `quoted_price`), bouton « commission encaissée »,
  champ note. `outcome` n'est proposé que sur les demandes `accepted`
  (une `lost` peut aussi se saisir dès `quoted` si le client ne répond pas).
  Correction possible : re-cliquer l'autre issue écrase (pas de machine à
  états rigide ici, c'est du constat a posteriori).
- **Cas relay** (partenaire `lead_routing='relay'`) : lien wa.me prérempli
  affiché (réutilise le builder existant de `email.ts`), pour le transfert
  manuel legacy.

### Vue Partenaires
- **Tableau** : nom, email, tél/WhatsApp, zones, commission, `lead_routing`,
  `active`, `outreach_status` (si présent), date d'ajout + **stats calculées** :
  invites reçues, devis gagnés (`quoted_by_partner_id`), locations `rented`,
  commission totale générée.
- **Écritures** : toggle `active`, édition des zones (cases à cocher sur les
  4 zones connues), édition du taux de commission. Pas de création de
  partenaire ici (l'auto-enroll signup + INSERT SQL couvrent déjà
  l'onboarding — YAGNI).

## 4. Code

- `src/lib/car-admin.ts` — **logique pure, zéro I/O** (pattern `car-lead.ts`) :
  calcul commission (arrondi centimes), agrégats des bandeaux, stats
  partenaires, validation des écritures (outcome, zones connues, commission
  0–1).
- `src/app/admin/car-rental/page.tsx` — server component : auth
  (query/cookie), lectures via `supabaseAdmin` (requests + invites + partners
  en 3 requêtes, jointures en mémoire), rendu des deux vues.
- `src/app/admin/car-rental/actions.ts` — server actions : `setOutcome`,
  `markCommissionPaid`, `saveNote`, `togglePartnerActive`, `updatePartner`
  (zones + commission). Chacune : revalide le cookie, valide via la logique
  pure, update, `revalidatePath`.
- Petits client components uniquement là où il faut de l'interactivité
  (champ montant, cases zones) ; le reste server-rendered.
- Erreurs : DB injoignable → message dans la page ; action échouée → message
  inline, pas de crash.

## 5. Tests

- `scripts/check-car-admin.mjs` (pattern maison `check-car-lead.mjs`) :
  calcul commission au taux partenaire, agrégats due/encaissée, stats
  partenaires, validations d'écriture (outcome invalide, commission hors
  bornes, zone inconnue).
- Gate d'accès vérifié en dev par curl (404 sans clé, 404 clé fausse, 307 +
  cookie sur la route auth). Le repo n'a pas d'infra Playwright configurée ;
  la vérification interactive complète (écritures) se fait sur la preview
  Vercel, qui a la service key.
- Build vert : `tsc` + `next build` avant tout push.

## 6. Livraison

- Branche `feat/car-admin` **rebasée sur `origin/main`** (le lot appel
  d'offres n'est pas encore dans master local). Stage explicite, jamais
  `git add -A`.
- Preview Vercel via push de la branche pour validation visuelle.
- **Pas de push prod sans GO explicite de Kami.**
- Post-déploiement : env `CAR_ADMIN_SECRET` dans Vercel, migration sur le
  VPS, URL + clé transmises à Kami en privé.

## Addendum 05/07 — refonte échelle 59 partenaires (audit UI/UX prod, GO Kami)

L'UI initiale supposait 1-3 partenaires ; l'outreach en a mis 59 en base.
Lot correctif (branche `feat/car-admin-ux`) :
1. Filtres partenaires de la vue Demandes : seulement les loueurs ayant
   **gagné ≥ 1 devis** (fini le mur de 59 pastilles).
2. Issue saisie → état compact, formulaires Loué/Perdu repliés derrière
   « corriger l'issue » (`<details>`).
3. `canSetOutcome` supprimé : **toute demande non classée est classable**
   (les vieilles `sent` relais étaient inclassables à vie).
4. Vue Partenaires : rangées compactes repliables (`<details>` natif),
   tri actifs puis devis gagnés puis nom, filtres actifs/inactifs + statut
   recrutement (dynamiques), recherche nom/email (form GET), compteur
   « N affichés sur M ».
5. Alerte rouge réservée à `declined` (l'inactif est l'état normal d'un
   prospect) ; badge inactif neutre.
6. Bandeau : commissions due/encaissée en vedette, statuts en
   compteurs-liens compacts cliquables (→ filtre), `email_failed` en rouge
   seulement si > 0.
Nouveaux query params : `pactive`, `poutreach`, `q` (onglet partners).
Toujours zéro JS client.

## Hors périmètre (YAGNI)

- Multi-utilisateurs, rôles, page de login.
- Création/suppression de partenaire dans l'UI (auto-enroll + SQL suffisent).
- Pilotage du recrutement outbound (ça vit sur le VPS :
  `/opt/car-rental-outreach/`, `detect_replies.py`) — l'admin ne fait
  qu'afficher `outreach_status`.
- Notifications sur changement de statut (Telegram couvre déjà le flux).
- Édition des données client d'une demande.
- Facturation automatique des agences.
