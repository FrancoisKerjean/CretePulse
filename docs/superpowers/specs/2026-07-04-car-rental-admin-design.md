# Back-office car rental — `/admin/car-rental` (crete.direct)

Date : 2026-07-04 · Statut : design validé par Kami (brainstorming session 04/07)

## Problème

Le wizard `/car-rental` (Phase 16) génère des leads dans la table `car_requests`
et un email relais vers contact@kairosguest.com avec lien wa.me prérempli vers
Auto Smart Rental (Panagoula, commission 10 %). Il n'existe **aucune interface
de gestion** : pas de vue des leads, pas de suivi de statut après transmission,
et surtout **aucune trace des montants de location** — donc rien pour calculer
et facturer la commission 10 % due par l'agence.

## Solution

Une page privée server-rendered `/admin/car-rental` dans cretepulse-build :
liste des leads, cycle de statuts, saisie du montant de location, commission
10 % calculée, relais WhatsApp 1-clic. Accès par secret. Pas de nouveau
service, pas de dépendance nouvelle.

## 1. Accès et sécurité

- Nouvelle env Vercel : `CAR_ADMIN_SECRET` (valeur générée, longue).
- Première visite : `/admin/car-rental?key=<secret>` → si la clé correspond,
  pose un cookie `car_admin` httpOnly/secure/sameSite=lax, durée 30 jours
  (valeur = le secret lui-même, comparé côté serveur à chaque requête).
- Sans clé ni cookie valide : `notFound()` (404 — on ne révèle pas l'existence
  de la page, pas d'écran de login).
- Chaque **server action** revalide le cookie avant toute écriture.
- Page `noindex, nofollow` (metadata robots). Hors arbre `[locale]` → absente
  du sitemap par construction.
- **Middleware** : le matcher next-intl (`src/middleware.ts:12`) n'exclut pas
  `admin` → sans modification, `/admin/car-rental` serait capturé par le
  routing i18n. Ajouter `admin` à la liste d'exclusions du matcher
  (au même titre que `api`).

## 2. Données — migration `car_requests` (Postgres self-host VPS)

Nouvelles colonnes (le champ `status` existant reste purement technique,
`sent` / `email_failed`, on n'y touche pas) :

| Colonne | Type | Défaut | Rôle |
|---|---|---|---|
| `lead_status` | text NOT NULL | `'new'` | cycle commercial |
| `rental_amount_eur` | numeric | NULL | montant location saisi à la main |
| `admin_note` | text | NULL | note libre |
| `lead_status_updated_at` | timestamptz | NULL | horodatage dernier changement |

Cycle `lead_status` : `new → forwarded → confirmed → rented → paid`,
plus `lost` accessible depuis n'importe quel état non terminal.
Transitions validées côté serveur (logique pure, voir §4) ; `paid` et `lost`
sont terminaux (correction possible uniquement en revenant via SQL, assumé —
YAGNI sur un bouton « annuler »).

Livraison : fichier `supabase/migrations/20260704_car_admin.sql` versionné +
**exécution manuelle sur le VPS** (`docker exec` psql sur `/opt/cretepulse-db`,
puis `NOTIFY pgrst, 'reload schema'`). La service key n'existe pas en local :
la migration ne peut être appliquée que depuis le VPS. La page doit tolérer
l'absence des colonnes avant migration (erreur affichée proprement, pas de
crash build).

## 3. Interface (une page, mobile-friendly)

- **Bandeau de synthèse** en tête : compteurs par `lead_status` + **commission
  due** (Σ 10 % de `rental_amount_eur` des leads `rented`) + **commission
  encaissée** (Σ 10 % des `paid`).
- **Tableau/cartes des leads**, plus récents en premier (sur mobile le tableau
  passe en cartes empilées) : date de création, client (nom, email, tél),
  pickup, dates + heures + n° de vol, type de véhicule, pax, note client,
  statut email technique (badge discret, alerte si `email_failed`),
  `lead_status` (badge coloré), montant, commission calculée.
- **Filtres** : par `lead_status` et par partenaire (`partner_name`) — prêt
  pour le multi-agences (zone lasithi-east vendable).
- **Par lead** :
  - Boutons de transition de statut (seules les transitions valides affichées).
  - Champ montant € + champ note (enregistrés via server action).
  - **Lien wa.me prérempli** vers le partenaire, même message que l'email
    relais (`src/lib/email.ts:224-229` : arrival/departure, car type, pax,
    guest). Le clic déclenche aussi le passage à `forwarded` (server action
    puis ouverture du lien).
- Pagination simple (50 par page) — volume attendu faible.
- Style : Tailwind du repo, sobre ; pas de composant lourd, pas de lib
  ajoutée.

## 4. Code

- `src/lib/car-admin.ts` — **logique pure, zéro I/O** (pattern
  `car-lead.ts`) : transitions valides, calcul commission, agrégats du
  bandeau. Le **builder du message WhatsApp est extrait de `email.ts`** dans
  un module partagé (réutilisé par l'email relais ET la page admin — pas de
  duplication).
- `src/app/admin/car-rental/page.tsx` — server component : auth (query/cookie),
  lecture `car_requests` via `supabaseAdmin`, rendu.
- `src/app/admin/car-rental/actions.ts` — server actions : `setLeadStatus`,
  `saveAmountAndNote`. Chacune : revalide le cookie, valide la transition via
  la logique pure, update + `lead_status_updated_at`, `revalidatePath`.
- Erreurs : DB injoignable → message d'erreur dans la page ; action échouée →
  message inline, pas de crash.

## 5. Tests

- `scripts/check-car-admin.mjs` (pattern maison `check-car-lead.mjs`) :
  transitions (valides/invalides/terminales), calcul commission (arrondi
  centimes), agrégats, message wa.me identique à l'existant.
- Playwright : accès refusé sans clé (404), accès avec clé, cookie posé,
  changement de statut visible. (Nécessite DB accessible — sinon le test
  se limite au gate d'accès.)
- Build vert : `tsc` + `next build` avant tout push.

## 6. Livraison

- Branche `feat/car-admin` (règle multi-terminal du repo). Stage explicite,
  jamais `git add -A`.
- Préview Vercel via push de la branche pour validation visuelle.
- **Pas de push `master:main` (prod) sans GO explicite de Kami.**
- Post-déploiement : ajouter `CAR_ADMIN_SECRET` dans Vercel, appliquer la
  migration sur le VPS, transmettre l'URL + clé à Kami en privé.

## Hors périmètre (YAGNI)

- Multi-utilisateurs, rôles, page de login.
- Notifications (Telegram/email) sur changement de statut.
- Édition des données client du lead.
- Dashboard analytique (graphes, tendances) — les compteurs du bandeau
  suffisent.
- Facturation automatique de l'agence.
