# Car Rental Direct — cockpit de monitoring `/admin/car-rental`

Date : 2026-07-08
Branche : `feat/car-admin-monitoring` (partie de `origin/master` = `cb9ef1b`, Phase 2 multi-devis incluse)
Base de référence : specs `2026-07-04-car-rental-admin-design.md`, `2026-07-08-car-rental-multi-quote-design.md`

## Problème

Depuis la Phase 2 (multi-devis + relances loueur/client + cron `car-relance`), `/admin/car-rental`
ne montre par demande que **les devis chiffrés + les désistés** (`QuotesList`). Trois angles morts :

1. **Loueurs silencieux invisibles.** Une invite `status='invited'` sans devis est filtrée de
   `QuotesList` → on ne voit jamais qui a été sollicité et n'a pas répondu.
2. **État des relances absent.** `relanced_at` (loueur), `client_relance_count` / `client_relanced_at`
   (client) sont en base mais jamais affichés. Impossible de savoir ce qui a été relancé, ce qui est dû.
3. **Aucun agrégat ni timeline.** Pas de KPI (taux de devis, délai 1ᵉʳ devis, taux de choix,
   désistement, décline), pas de fil chronologique, perf loueur limitée à `won`.

Objectif Kami : « voir exactement tout ce qui se passe » sur chaque demande, sans requête SQL manuelle.

## Objectifs

- Rendre visible le **niveau invite** complet : chiffré / désisté / **silencieux**, avec état de relance.
- Exposer l'**état des relances** deux côtés (loueur, client) et l'**expiry** de l'offre.
- Fournir un **bandeau KPI** (fenêtres 7 j / 30 j) et une **perf loueur enrichie**.
- **Zéro donnée inventée** : chaque chiffre vient d'une colonne réelle. Métrique non calculable = non affichée.

## Non-objectifs

- Aucune migration DB (toutes les colonnes existent depuis `20260708_car_multi_quote.sql`).
- Pas de modification du flux public (`/car-quote`, `/car-offer`), des crons, ni des server actions
  existantes (`setOutcome`, `setCommissionPaid`, `saveNote`, `updatePartner`, `togglePartnerActive`).
- Pas de client JS lourd : server-first, forms natifs, liens query-string (comme l'existant).

## Caveat de données (honnête)

Le multi-devis vient d'arriver en prod : le cockpit est **forward-looking**. Au début, peu de vraies
lignes multi-devis, et les **anciennes demandes first-come** portent le devis sur `car_requests.quoted_*`
mais leurs invites restent `invited` (piège documenté dans le cron `car-relance`). Conséquence :
- Les KPI 7 j / 30 j seront **sparse** tant que le volume multi-devis est faible — c'est attendu, pas un bug.
- Les métriques invite-niveau (délai 1ᵉʳ devis, désistement, réponse loueur) se calculent **sur les
  colonnes invite** ; une demande first-come sans `quoted_at` invite ne pollue pas ces calculs (exclue
  proprement, jamais comptée comme « silencieuse à tort » : cf. règle de classification ci-dessous).

## Modèle de données (lecture seule, déjà en place)

`car_quote_invites` : `id, request_id, partner_id, quote_token_hash, created_at, status`
(`invited|quoted|declined|chosen|not_chosen`), `quote_price, quote_currency, quote_car_model,
quote_inclusions (jsonb), quoted_at, declined_at, relanced_at`.

`car_requests` : colonnes existantes + `client_relanced_at, client_relance_count`.
Statuts demande : `sent | quoted | accepted | email_failed | declined_by_client` (+ `outcome` rented/lost).

## Architecture

### Nouveau module pur `src/lib/car-monitoring.ts` (+ `scripts/check-car-monitoring.mjs`, `check:car-monitoring`)

Préoccupation distincte de `car-admin.ts` (commissions/CRUD, 186 l.) et `car-quotes.ts` (transitions).
Zéro I/O, Node-safe (`--experimental-strip-types`). Importe `car-quotes.ts` et `car-offer-expiry.ts`,
ne les réécrit pas. Contient : rollup des invites par demande, classification, décompte de relance,
KPI agrégés, perf loueur enrichie, construction de timeline. Câblé dans le script agrégé `check`.

### Types (entrée)

Un type invite enrichi consommé par le module et la page :

```ts
export interface MonitorInvite {
  id: number;
  request_id: number;
  partner_id: number;
  partner_name: string;
  status: string;            // invited | quoted | declined | chosen | not_chosen
  quote_price: number | null;
  quote_currency: string | null;
  quote_car_model: string | null;
  created_at: string;        // invitation envoyée
  quoted_at: string | null;
  declined_at: string | null;
  relanced_at: string | null;
}
```

### Fonctions pures (signatures)

```ts
// Classe les invites d'UNE demande en 3 seaux ordonnés pour l'affichage.
// chiffrés triés prix↑ (choisi en tête via findChosenInvite) → silencieux → désistés.
classifyInvites(invites: MonitorInvite[]): {
  quoted: MonitorInvite[]; silent: MonitorInvite[]; declined: MonitorInvite[];
};

// État de relance loueur pour UNE invite silencieuse, à `now`.
// Réutilise partnerNeedsRelance (car-quotes.ts) pour l'éligibilité.
partnerRelanceState(inv: MonitorInvite, requestStatus: string, createdAtMs: number, nowMs: number):
  { kind: "relanced"; at: string } | { kind: "due" } | { kind: "dueInMs"; ms: number } | { kind: "never" };

// État de relance client pour UNE demande, à `now`. Réutilise clientNeedsRelance.
clientRelanceState(req, nowMs):
  { kind: "eligible" } | { kind: "waiting"; nextEligibleMs: number } | { kind: "exhausted" } | { kind: "na" };

// Rollup relances loueur d'une demande : { invited, relanced, silent }.
partnerRelanceRollup(invites: MonitorInvite[]): { invited: number; relanced: number; silent: number };

// Timeline chronologique d'une demande (events datés, réels seulement).
buildTimeline(req, invites): Array<{ at: string; label: string }>;

// Filtres dérivés (pour les nouveaux onglets de filtre).
isSilentRequest(req, invites, nowMs): boolean;   // ouvert >24h, 0 invite chiffrée
isAwaitingChoice(req, invites): boolean;         // status 'quoted' avec ≥1 invite chiffrée, non tranché

// KPI agrégés sur une fenêtre (reqs filtrées par created_at >= windowStart).
kpis(reqs, invitesByRequest, nowMs): CockpitKpis;

// Perf loueur enrichie (au-delà de partnerStats.won).
partnerPerf(partnerId, invitesByPartner: Map<number, MonitorInvite[]>): {
  invited: number; quoted: number; chosen: number; declined: number;
  avgQuotePriceEur: number | null; responseRate: number | null; avgResponseHours: number | null;
};
```

### KPI — définitions mappées aux colonnes réelles

| KPI | Calcul (colonnes réelles) |
|---|---|
| Taux de devis | # demandes avec ≥1 invite `quote_price != null` / # demandes de la fenêtre |
| Nb moyen devis/demande | moyenne du # invites chiffrées par demande |
| Délai médian 1ᵉʳ devis | médiane de `min(invite.quoted_at) − request.created_at` (demandes ayant ≥1 devis) |
| Taux de choix | # `accepted` / # `quoted` (demandes ayant reçu ≥1 devis) |
| Taux désistement loueur | # invites `declined` / # invites totales |
| Taux décline client | # `declined_by_client` / # demandes avec ≥1 devis |
| Efficacité relance loueur | # invites où `quoted_at > relanced_at` / # invites `relanced_at != null` |
| Efficacité relance client | # demandes `accepted_at > client_relanced_at` / # demandes `client_relance_count > 0` |
| % invites silencieuses | # invites `status='invited'` sans `quoted_at` ni `declined_at` / # invites totales |

Toute métrique dont le dénominateur est 0 sur la fenêtre → affichée `—` (jamais un ratio inventé).

### Page `src/app/admin/car-rental/page.tsx`

Étendre **la requête invites** (aujourd'hui `request_id, partner_id, status, quote_price, car_partners(name)`)
pour lire aussi `created_at, quoted_at, declined_at, relanced_at, quote_currency, quote_car_model`.
Grouper en **une seule** `Map<request_id, MonitorInvite[]>` (pas de N+1). Passer aux composants.
Calculer `kpis()` pour 7 j et 30 j et les passer au bandeau.

### Composants

- **`kpi-band.tsx`** (nouveau) : bandeau agrégats 7 j / 30 j sous le bandeau commission existant.
- **`requests-table.tsx`** : remplacer `QuotesList` par un **roster complet** (chiffrés/silencieux/désistés)
  avec badges de relance + expiry + timeline repliée (`<details>`). Ajouter les 3 filtres.
- **`partners-table.tsx`** : brancher `partnerPerf` (colonnes invited/quoted/chosen/declined/prix moyen/
  taux réponse/délai moyen) en plus des stats actuelles.

## Découpage de livraison (approche A)

**P1 — visibilité invite + relances (déployable seule)** :
- `car-monitoring.ts` : `classifyInvites`, `partnerRelanceState`, `clientRelanceState`,
  `partnerRelanceRollup`, `buildTimeline`, `isSilentRequest`, `isAwaitingChoice` + `check:car-monitoring`.
- Extension requête invites (page.tsx) + `MonitorInvite`.
- `requests-table.tsx` : roster complet + relances + expiry + timeline + 3 filtres.
- Commit(s), `tsc` vert, checks verts, déploiement `master:main`.

**P2 — KPI + perf loueur (suit)** :
- `car-monitoring.ts` : `kpis`, `partnerPerf` + tests.
- `kpi-band.tsx` + câblage page.tsx (fenêtres 7 j/30 j).
- `partners-table.tsx` enrichi.
- Commit(s), verts, déploiement.

## Tests

- **Purs (`check:car-monitoring`)** : tri/classification (chiffré→silencieux→désisté, choisi en tête),
  relanceState loueur (relancé/due/dueInMs/never), clientRelanceState (eligible/waiting/exhausted/na),
  isSilentRequest, isAwaitingChoice, chaque KPI (dont dénominateur 0 → `—`), partnerPerf (moyennes, taux).
  Injecter des fixtures couvrant tous les états. Câblé dans `npm run check`.
- **e2e ciblé (manuel, puis nettoyage)** : insérer en DB des demandes marquées `customer_email` `+cartest`
  et des loueurs test `active=false`, couvrant TOUS les états (invited silencieux, quoted, declined loueur,
  chosen, not_chosen, declined_by_client, relancé 1×/2×). Vérifier le rendu du cockpit. **Puis supprimer.**
  JAMAIS de vraie demande live (spam loueurs réels — leçon 04/07).

## Contraintes non négociables

- Git author : `git -c user.name=kerjeanfrancois29 -c user.email=kerjeanfrancois29@gmail.com commit`.
- Jamais de commit direct sur `master`/`main`. Déploiement = push `feat/car-admin-monitoring:master` puis
  `:main` (acte conscient), APRÈS `npx tsc --noEmit -p tsconfig.json` vert + checks purs verts.
- Logique de calcul (KPI, timeline, éligibilité, expiry) dans des fonctions **pures testées**, pas dans le JSX.
- Admin protégé par le secret existant (`isCarAdmin`). Emails clients OK côté admin, **jamais** de token en
  clair ni d'IP (RGPD).
- Perf : une seule requête invites groupée en Map, pas de N+1.
- Server-first : forms natifs + liens query-string, classes Tailwind du repo (`sea`, `sun`, `ok`,
  `terracotta`, `border`, `text-muted`…).

## Fichiers touchés

Nouveaux : `src/lib/car-monitoring.ts`, `scripts/check-car-monitoring.mjs`,
`src/app/admin/car-rental/kpi-band.tsx` (P2).
Modifiés : `src/app/admin/car-rental/page.tsx`, `requests-table.tsx`, `partners-table.tsx` (P2),
`package.json` (script `check:car-monitoring` + ajout à `check`).
Inchangés : `car-admin.ts`, `car-quotes.ts`, `car-offer-expiry.ts`, `actions.ts`, crons, flux public.
