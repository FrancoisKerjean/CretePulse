# Catalogue de prix des loueurs et acompte en ligne : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** les loueurs publient une grille de prix, le client voit des offres au prix réel, paie 10 % d'acompte en ligne, le loueur confirme sous 4 h d'ouverture ou le client est remboursé.

**Architecture :** les grilles produisent des lignes `car_quote_options` (source `catalogue`) dans le parcours de devis existant, donc la page d'offres, l'admin et les relances restent les mêmes. L'acompte remplace le tunnel de paiement total de juillet au même point d'accroche (`startBookingAfterAccept`), sur le compte Stripe NovAI, sans Connect. Toute la logique de prix, de délai et de remboursement vit dans deux modules purs testés (`car-catalogue.ts`, `car-deposit.ts`) ; les routes ne font que lire, appeler et écrire.

**Tech Stack :** Next.js 16 App Router, TypeScript, Postgres self-hosted derrière PostgREST (`supabaseAdmin`), Stripe Checkout et Refunds, Resend, Vitest.

**Spec :** `docs/superpowers/specs/2026-11-25-car-catalogue-acompte-design.md` (approuvée par François le 26/11/2026). Lire la spec avant toute tâche.

## Global Constraints

- Interrupteur : `process.env.CAR_CATALOGUE_ENABLED === "on"`, éteint par défaut. Éteint, le parcours client est exactement celui d'aujourd'hui. Le portail loueur (`/[locale]/car-rates/[token]`) et la page de conditions marchent quel que soit l'interrupteur.
- Acompte = `round2(total × car_partners.commission)`, jamais un 10 % codé en dur. Refusé sous `STRIPE_MIN_CHARGE_EUR` (0,50 €).
- Montants Stripe en centimes entiers ; montants en base en euros, arrondis au centime.
- Heures : `Europe/Athens` par `Intl`, jamais un décalage fixe. Fenêtre d'ouverture 08:00 à 22:00, délai de confirmation 240 minutes d'ouverture, marge minimale de 2 h avant la prise.
- Annulation client : remboursement intégral si l'heure de prise est à 48 h ou plus (`REFUND_WINDOW_HOURS = 48`), sinon acompte gardé. Une réservation pas encore confirmée par le loueur est toujours remboursée intégralement.
- Aucune coordonnée échangée avant `booking_status = 'confirmed'` : ni téléphone ou e-mail du loueur vers le client, ni ceux du client vers le loueur.
- Version des conditions : `CAR_TERMS_VERSION = "2027-01"`. Interrupteur allumé, seul un loueur avec `terms_version = CAR_TERMS_VERSION` reçoit des demandes.
- Webhook : `metadata.payment_type = "car_deposit"`, `metadata.brand = "crete.direct"`, registre `stripe_webhook_events` (scope `car`) pour l'idempotence.
- Toute écriture `supabaseAdmin` lit `error` et lève via `assertWritten` (`src/lib/car-invoice-server.ts`) : PostgREST ne lève jamais seul.
- Textes lus par un humain : accents corrects dans les 4 langues client (en, fr, de, el) ; pages et e-mails loueur en anglais ; aucun tiret cadratin.
- Git : branche `feat/car-catalogue`, fichiers indexés un par un (jamais `git add -A`), auteur kerjeanfrancois29, fin de chantier par `npm run ship`. Jamais de push sur `main`.

## Review Focus

1. Deux onglets, deux offres choisies : une seule réservation peut être en cours par demande. Un second choix pendant `pending_payment`, `awaiting_partner` ou `confirmed` rend 409 (test en tâche 8).
2. Le loueur clique « Confirm » après le remboursement automatique, ou clique deux fois, ou « Confirm » puis « Not available » : rien ne bouge, la page dit l'état réel (tests en tâche 9).
3. Le loueur modifie sa grille entre l'affichage de l'offre et le paiement : le client paie l'acompte calculé sur le prix figé de l'offre, jamais sur la grille du moment (test en tâche 8).
4. Le webhook `checkout.session.completed` arrive pour une session qui n'est plus celle de la demande : on n'écrase rien, on rembourse et on alerte ops (test en tâche 9).
5. Changement d'heure : un paiement la veille du passage à l'heure d'été reçoit la bonne échéance (test en tâche 3).

---

### Task 1 : schéma de données

**Files :**
- Create : `supabase/migrations/20261126_car_catalogue.sql`

**Interfaces :**
- Produces (colonnes et tables utilisées par toutes les tâches suivantes) :
  - `car_partners` : `portal_token text unique`, `terms_version text`, `terms_accepted_at timestamptz`, `rates_expiry_reminded_at timestamptz`, `rates_status text not null default 'none' check (rates_status in ('none','draft','live','paused'))`, `rates_paused_until date`, `rates_published_at timestamptz`, `catalogue_conditions jsonb`.
  - Table `car_partner_rates` : `id bigserial primary key`, `partner_id bigint not null references car_partners(id) on delete cascade`, `category text not null check (category in ('city','compact','sedan','automatic','suv'))`, `period_from date not null`, `period_to date not null check (period_to >= period_from)`, `min_days int not null check (min_days >= 1)`, `eur_per_day numeric not null check (eur_per_day > 0)`, `source text`, `created_at timestamptz not null default now()`, `unique (partner_id, category, period_from, min_days)`.
  - `car_quote_options` : `source text not null default 'quote' check (source in ('quote','catalogue'))`.
  - `car_requests` : `deposit_option_id bigint`, `deposit_eur numeric`, `deposit_rate numeric`, `confirm_deadline_at timestamptz`, `confirm_reminded_at timestamptz`, `partner_confirm_token text unique`, `partner_confirmed_at timestamptz`, `refund_reason text check (refund_reason in ('partner_declined','partner_timeout','client_cancelled','partner_cancelled','ops'))`. Index partiel sur `confirm_deadline_at where booking_status = 'awaiting_partner'`.
  - `car_commission_invoices` : `settlement text check (settlement in ('deposit_compensation'))`.
  - Valeurs de `booking_status` pour l'acompte (colonne texte existante, sans contrainte) : `pending_payment`, `awaiting_partner`, `confirmed`, `refunded`, `cancelled_kept`.
  - Fin du fichier : `notify pgrst, 'reload schema';`

- [ ] **Step 1 : écrire la migration**, uniquement des `add column if not exists`, `create table if not exists`, `create index if not exists` : rien de destructif. En tête, un commentaire qui renvoie à la spec.
- [ ] **Step 2 : essai à blanc sur la base de prod**, dans une transaction annulée :

```bash
scp supabase/migrations/20261126_car_catalogue.sql kairos-vps:/tmp/m.sql
ssh kairos-vps '(echo "begin;"; cat /tmp/m.sql; echo "rollback;") | docker exec -i cretepulse-postgres psql -U postgres -d cretepulse -v ON_ERROR_STOP=1'
```
Attendu : aucune ligne `ERROR`, dernière ligne `ROLLBACK`.

- [ ] **Step 3 : appliquer pour de bon** (migration additive, sans effet tant que le code ne la lit pas) :

```bash
ssh kairos-vps 'docker exec -i cretepulse-postgres psql -U postgres -d cretepulse -v ON_ERROR_STOP=1 < /tmp/m.sql && rm /tmp/m.sql'
```
Vérifier : `select count(*) from information_schema.columns where table_name='car_requests' and column_name in ('deposit_eur','confirm_deadline_at','partner_confirm_token');` rend `3`.

- [ ] **Step 4 : commit** `feat(car): schéma du catalogue et de l'acompte`.

---

### Task 2 : calcul du prix d'une grille

**Files :**
- Create : `src/lib/car-catalogue.ts`, `src/lib/car-catalogue.test.ts`

**Interfaces :**
- Consumes : `rentalDays(dateFrom, dateTo, timeFrom?, timeTo?)` de `src/lib/car-pricing.ts`.
- Produces :
  - `export const CAR_CATEGORIES = ["city","compact","sedan","automatic","suv"] as const; export type CarCategory = typeof CAR_CATEGORIES[number];`
  - `export interface RateRow { category: CarCategory; period_from: string; period_to: string; min_days: number; eur_per_day: number; source?: string | null }`
  - `export interface CatalogueConditions { models?: Partial<Record<CarCategory, { model: string; gearbox: "manual" | "automatic" | null }>>; inclusions?: string[]; deposit_hold_eur?: number | null; child_seat_eur_day?: number | null; delivery_fees?: Record<string, number>; cancellation_terms?: string | null }` (assurance et franchise : colonnes `default_*` existantes de `car_partners`)
  - `export interface CatalogueRequest { category: string; pickupSlug: string; dateFrom: string; dateTo: string; timeFrom?: string | null; timeTo?: string | null }`
  - `export function catalogueQuote(rates: RateRow[], conditions: CatalogueConditions | null, req: CatalogueRequest): { total: number; days: number } | null`
  - `export function fromPricePerDay(rates: RateRow[], req: Omit<CatalogueRequest, "category" | "pickupSlug">, category: CarCategory): number | null` : prix par jour le plus bas d'une grille pour ces dates, livraison exclue.
  - `export function depositEur(total: number, rate: number): number | null` : `round2(total × rate)`, `null` sous 0,50 € ou si `rate` n'est pas dans ]0, 1[.
  - `export function validateRatesInput(raw: unknown): { ok: true; rows: RateRow[] } | { ok: false; errors: string[] }` : refuse une catégorie inconnue, une période à l'envers, `min_days < 1`, un prix ≤ 0 ou > 1000, deux lignes avec la même clé (catégorie, début, palier), et deux périodes qui se chevauchent pour la même catégorie et le même palier.

Règle de calcul (spec section 6) : `days = rentalDays(...)` ; pour chaque jour `dateFrom + i` (i de 0 à days-1), parmi les lignes de la catégorie dont la période contient ce jour et dont `min_days <= days`, prendre celle au `min_days` le plus grand ; un seul jour sans ligne → `null`. Total = somme + `delivery_fees[pickupSlug] ?? 0`, arrondi au centime.

- [ ] **Step 1 : écrire les tests** avec ce jeu de tarifs `compact` : juin 2027 (`2027-06-01` → `2027-06-30`) 45 €/j dès 3 jours et 40 €/j dès 7 jours ; juillet-août (`2027-07-01` → `2027-08-31`) 55 €/j dès 3 jours et 50 €/j dès 7 jours.

```ts
it("sums each day at its period's rate with the bracket chosen on total days", () => {
  expect(catalogueQuote(RATES, null, { category: "compact", pickupSlug: "chania", dateFrom: "2027-06-28", dateTo: "2027-07-05", timeFrom: "10:00", timeTo: "10:00" }))
    .toEqual({ total: 320, days: 7 }); // 3 × 40 + 4 × 50
});
it("adds the delivery fee of the pickup", () => {
  expect(catalogueQuote(RATES, { delivery_fees: { "chania-airport": 15 } }, { ...REQ_7D, pickupSlug: "chania-airport" })?.total).toBe(335);
});
it("uses the 3-day bracket for a 5-day July rental", () => {
  expect(catalogueQuote(RATES, null, { category: "compact", pickupSlug: "chania", dateFrom: "2027-07-10", dateTo: "2027-07-15", timeFrom: "09:00", timeTo: "09:00" })?.total).toBe(275);
});
it("returns null when one day falls outside every period", () => {
  expect(catalogueQuote(RATES, null, { ...REQ_7D, dateFrom: "2027-08-28", dateTo: "2027-09-04" })).toBeNull();
});
it("returns null for a category without rates", () => {
  expect(catalogueQuote(RATES, null, { ...REQ_7D, category: "suv" })).toBeNull();
});
it("fromPricePerDay gives the cheapest per-day for the dates", () => {
  expect(fromPricePerDay(RATES, { dateFrom: "2027-07-10", dateTo: "2027-07-20", timeFrom: "09:00", timeTo: "09:00" }, "compact")).toBe(50);
});
it("depositEur rounds to the cent and refuses below Stripe's minimum", () => {
  expect(depositEur(412, 0.1)).toBe(41.2);
  expect(depositEur(333.33, 0.1)).toBe(33.33);
  expect(depositEur(4, 0.1)).toBeNull();
  expect(depositEur(400, 0)).toBeNull();
});
it("validateRatesInput rejects overlapping periods for the same category and bracket", () => {
  const r = validateRatesInput([ROW("2027-07-01", "2027-07-31", 3), ROW("2027-07-15", "2027-08-15", 3)]);
  expect(r.ok).toBe(false);
});
```
Plus un test par autre motif de refus de `validateRatesInput`, et un cas valide qui rend les lignes normalisées (nombres, dates ISO).

- [ ] **Step 2 :** `npx vitest run src/lib/car-catalogue.test.ts` → échec, module absent.
- [ ] **Step 3 : implémenter `src/lib/car-catalogue.ts`**, pur, sans I/O. Les dates se manipulent en UTC à partir des chaînes ISO (`Date.UTC`), jamais en heure locale de la machine.
- [ ] **Step 4 :** `npx vitest run src/lib/car-catalogue.test.ts` → tout passe.
- [ ] **Step 5 : commit** `feat(car): calcul du prix d'une grille de loueur`.

---

### Task 3 : délais, annulation, suspension

**Files :**
- Create : `src/lib/car-deposit.ts`, `src/lib/car-deposit.test.ts`

**Interfaces :**
- Consumes : `REFUND_WINDOW_HOURS` (48) de `src/lib/booking-policy.ts` ; `STRIPE_MIN_CHARGE_EUR` de `src/lib/car-commission.ts`.
- Produces :
  - `export type DepositStatus = "pending_payment" | "awaiting_partner" | "confirmed" | "refunded" | "cancelled_kept"`
  - `export type RefundReason = "partner_declined" | "partner_timeout" | "client_cancelled" | "partner_cancelled" | "ops"`
  - `export const CONFIRM_OPEN_MINUTES = 240; export const OPEN_HOUR = 8; export const CLOSE_HOUR = 22; export const PICKUP_MARGIN_MS = 2 * 3600_000; export const SUSPEND_AFTER_FAILURES = 3; export const SUSPEND_WINDOW_DAYS = 30;`
  - `export function athensWallToUtcMs(date: string, time: string): number`
  - `export function confirmDeadlineMs(paidAtMs: number): number` : `paidAtMs` + 240 minutes comptées uniquement entre 08:00 et 22:00 heure d'Athènes. Approche : avancer minute par minute avec un seul `Intl.DateTimeFormat` mis en cache, en ne comptant que les minutes ouvertes (au plus 3 jours d'itérations).
  - `export function isBookableOnline(nowMs: number, pickupMs: number): boolean` : `confirmDeadlineMs(nowMs) <= pickupMs - PICKUP_MARGIN_MS`.
  - `export function reminderDueMs(paidAtMs: number, deadlineMs: number): number` : milieu de l'intervalle.
  - `export function clientCancelRefundEur(status: DepositStatus, depositEur: number, hoursUntilPickup: number): number` : `awaiting_partner` → tout l'acompte ; `confirmed` → tout si `hoursUntilPickup >= 48`, sinon 0 ; autres états → 0.
  - `export function shouldSuspendPartner(failuresInWindow: number): boolean` : `>= SUSPEND_AFTER_FAILURES`.
  - `export function buildDepositCheckoutParams(i: { requestId: number; customerEmail: string; depositEur: number; partnerName: string; carLabel: string; dateFrom: string; dateTo: string; bookingToken: string; locale: string; nowMs: number }): Stripe.Checkout.SessionCreateParams` : `mode: "payment"`, une ligne au montant de l'acompte en centimes, `expires_at` = maintenant + 30 min, `metadata: { payment_type: "car_deposit", brand: "crete.direct", car_request_id }`, `payment_intent_data.metadata` identique, `statement_descriptor_suffix: "CRETE DIRECT"`, `success_url` = `/{locale}/car-booking/{token}?paid=1`, `cancel_url` = `/{locale}/car-booking/{token}` (base `siteBase()` de `car-quote.ts`).

- [ ] **Step 1 : écrire les tests**

```ts
const at = (d: string, t: string) => athensWallToUtcMs(d, t);
it("athensWallToUtcMs follows summer and winter time", () => {
  expect(at("2027-07-10", "10:00")).toBe(Date.UTC(2027, 6, 10, 7, 0));
  expect(at("2027-01-10", "10:00")).toBe(Date.UTC(2027, 0, 10, 8, 0));
});
it("deadline inside opening hours is +4 h", () => {
  expect(confirmDeadlineMs(at("2027-07-10", "10:00"))).toBe(at("2027-07-10", "14:00"));
});
it("deadline spills over the night", () => {
  expect(confirmDeadlineMs(at("2027-07-10", "21:30"))).toBe(at("2027-07-11", "11:30"));
});
it("payment at night starts counting at 08:00", () => {
  expect(confirmDeadlineMs(at("2027-07-10", "23:15"))).toBe(at("2027-07-11", "12:00"));
});
it("deadline across the switch to summer time", () => {
  expect(confirmDeadlineMs(at("2027-03-27", "21:30"))).toBe(at("2027-03-28", "11:30"));
});
it("not bookable when the deadline lands less than 2 h before pickup", () => {
  const now = at("2027-07-10", "21:30"); // échéance 11:30 le 11
  expect(isBookableOnline(now, at("2027-07-11", "13:30"))).toBe(true);
  expect(isBookableOnline(now, at("2027-07-11", "13:29"))).toBe(false);
});
it("client cancellation: unconfirmed is always refunded, confirmed follows 48 h", () => {
  expect(clientCancelRefundEur("awaiting_partner", 41.2, 3)).toBe(41.2);
  expect(clientCancelRefundEur("confirmed", 41.2, 48)).toBe(41.2);
  expect(clientCancelRefundEur("confirmed", 41.2, 47.9)).toBe(0);
});
it("deposit checkout carries the deposit in cents and the car_deposit tag", () => {
  const p = buildDepositCheckoutParams({ ...INPUT, depositEur: 41.2 });
  expect(p.line_items?.[0]?.price_data?.unit_amount).toBe(4120);
  expect(p.metadata).toMatchObject({ payment_type: "car_deposit", brand: "crete.direct", car_request_id: "25" });
  expect(p.expires_at).toBe(Math.floor(INPUT.nowMs / 1000) + 1800);
});
```
Plus `shouldSuspendPartner(2) === false`, `shouldSuspendPartner(3) === true`.

- [ ] **Step 2 :** `npx vitest run src/lib/car-deposit.test.ts` → échec, module absent.
- [ ] **Step 3 : implémenter `src/lib/car-deposit.ts`**. `athensWallToUtcMs` : partir de `Date.UTC` sur l'heure murale, lire le décalage d'Athènes à cet instant par `Intl` (`timeZoneName: "longOffset"`), le soustraire, puis relire une fois pour les heures proches du changement d'heure.
- [ ] **Step 4 :** `npx vitest run src/lib/car-deposit.test.ts` → tout passe.
- [ ] **Step 5 : commit** `feat(car): délai de confirmation, annulation et paiement de l'acompte`.

---

### Task 4 : portail loueur (identité, conditions, grille)

**Files :**
- Create : `src/lib/car-catalogue-db.ts`, `src/app/api/car-rental/partner-portal/route.ts`, `src/app/api/car-rental/partner-portal/route.test.ts`, `src/app/[locale]/car-rates/[token]/page.tsx`, `src/app/[locale]/car-rates/[token]/PortalForm.tsx`
- Modify : `src/lib/email.ts` (`sendAgencyQuoteRequest` : paramètre optionnel `portalUrl`), `src/app/api/car-rental/submit/route.ts` (passer `portalUrl`), `src/app/admin/car-rental/partners-table.tsx` et `actions.ts` (lien « Portail »)

**Interfaces :**
- Consumes : `RateRow`, `CatalogueConditions`, `validateRatesInput` (tâche 2) ; `partnerBillingIdentity`, `PARTNER_IDENTITY_COLS` de `src/lib/car-invoice.ts` ; `newToken` de `src/lib/car-quote.ts` ; `CAR_TERMS_VERSION` (créé dans cette tâche, texte en tâche 5).
- Produces :
  - `export const CAR_TERMS_VERSION = "2027-01"` dans `src/lib/car-catalogue.ts`
  - `export function isPartnerBookable(p: { terms_version: string | null; terms_accepted_at: string | null }): boolean`, dans `car-catalogue.ts`, testée
  - `car-catalogue-db.ts` : `partnerByPortalToken(token: string): Promise<PortalPartner | null>`, `ensurePortalToken(partnerId: number): Promise<string>`, `ratesForPartner(partnerId: number): Promise<RateRow[]>`, `replaceRates(partnerId: number, rows: RateRow[]): Promise<void>`, `liveCataloguesForPartners(partnerIds: number[]): Promise<Map<number, { rates: RateRow[]; conditions: CatalogueConditions | null }>>` (seulement `rates_status = 'live'` et pas suspendu à la date du jour par `rates_paused_until`)
  - `POST /api/car-rental/partner-portal`, corps `{ token, action, ... }`, actions : `save_identity` (champs de `PARTNER_IDENTITY_COLS`), `save_rates` (`rows`, `conditions` : écrit la grille et passe `rates_status` à `draft` si elle était `none`), `accept_terms` (`publish: boolean`), `pause` (`until: "YYYY-MM-DD"`), `resume`.

Règles de `accept_terms` : refus 422 avec la liste `missing` si `partnerBillingIdentity` n'est pas complète ; sinon `terms_version = CAR_TERMS_VERSION`, `terms_accepted_at = now()`. Avec `publish: true`, il faut au moins une ligne de grille (sinon 422), puis `rates_status = 'live'` et `rates_published_at = now()`.

- [ ] **Step 1 : écrire les tests de route** (même câblage moqué que `src/app/api/car-rental/booking/route.test.ts`) :
  - `accept_terms` sans identité complète → 422, `missing` non vide, aucune écriture ;
  - `accept_terms` avec identité complète, sans `publish` → écrit `terms_version: "2027-01"`, ne touche pas `rates_status` ;
  - `accept_terms` avec `publish` mais sans aucune ligne de grille → 422 ;
  - `save_rates` invalide (périodes qui se chevauchent) → 400 avec `errors` ;
  - jeton inconnu → 404.
  Ajouter dans `car-catalogue.test.ts` : `isPartnerBookable` faux pour `terms_version` null ou `"2026-01"`, vrai pour `"2027-01"` avec une date d'acceptation.
- [ ] **Step 2 :** `npx vitest run src/app/api/car-rental/partner-portal src/lib/car-catalogue.test.ts` → échec.
- [ ] **Step 3 : implémenter** `car-catalogue-db.ts` et la route. `replaceRates` supprime puis insère les lignes du loueur ; chaque écriture passe par `assertWritten`.
- [ ] **Step 4 : implémenter la page** `/[locale]/car-rates/[token]` (anglais seulement ; pour une autre locale, redirection vers `/en/...`) : 1. identité de facturation, 2. tableau éditable catégories × périodes × paliers, avec la source de chaque valeur amorcée affichée en gris, et les conditions communes en dessous, 3. lien vers `/en/car-partner-terms`, case « I accept these terms », boutons « Publish these prices » et « Accept these terms » (sans grille), 4. « Fleet full until… » et « Resume ». `PortalForm` est un composant client qui poste sur la route ; le style reprend `car-quote/[token]/QuoteForm.tsx`.
- [ ] **Step 5 : lien du portail.**
  - `sendAgencyQuoteRequest` reçoit `portalUrl?: string` et ajoute une ligne « Your 2027 prices and terms: {url} » quand il est fourni ; `submit` le passe via `ensurePortalToken`.
  - L'admin affiche par loueur un lien « Portail », l'état des conditions (version, date) et `rates_status`, derrière `isCarAdmin()`.
- [ ] **Step 6 :** `npx vitest run src/app/api/car-rental/partner-portal src/lib/car-catalogue.test.ts && npx tsc --noEmit` → vert.
- [ ] **Step 7 : commit** `feat(car): portail loueur, identité, conditions et grille de prix`.

---

### Task 5 : conditions loueurs, version 2027-01

**Files :**
- Modify : `src/app/[locale]/car-partner-terms/page.tsx`, `src/app/[locale]/car-partner-terms/page.test.ts`

**Interfaces :**
- Consumes : `CAR_TERMS_VERSION` (tâche 4).

- [ ] **Step 1 : adapter le test** : la page affiche « Version 2027-01 » ; elle ne contient plus « We do not sell, hold or cancel anything » ni « the traveller pays you directly » ; elle contient les mots « deposit », « 4 opening hours » et « 48 hours ».
- [ ] **Step 2 :** `npx vitest run "src/app/[locale]/car-partner-terms"` → échec.
- [ ] **Step 3 : réécrire les sections** selon la spec, section 9 et section 11 : prix publiés qui engagent ; mandat d'encaissement de l'avance (le taux de commission du loueur) gardée en paiement de la commission, facturée en autoliquidation et réglée par compensation ; 90 % encaissés au comptoir, rien d'autre que les options prises sur place ; confirmation ou refus sous 4 heures d'ouverture (08:00-22:00, heure d'Athènes), sinon réservation libérée et client remboursé ; annulation client gratuite jusqu'à 48 h avant la prise, avance gardée ensuite ; loueur qui annule après confirmation : client remboursé, avoir, et suspension de la grille après 3 manquements en 30 jours ; surfacturation au comptoir = exclusion. La section TVA existante reste.
- [ ] **Step 4 :** test vert, puis `npx tsc --noEmit`.
- [ ] **Step 5 : commit** `feat(car): conditions loueurs 2027-01, acompte et confirmation`.

---

### Task 6 : offres de grille à l'envoi du formulaire

**Files :**
- Modify : `src/lib/car-catalogue.ts` (+ tests), `src/app/api/car-rental/submit/route.ts`, `src/lib/car-quotes.ts` (`QuoteOption.source`), `src/lib/car-quotes-db.ts` (`optionsForRequest` lit `source`), `src/components/car-rental/CarRentalWizard.tsx` (redirection)

**Interfaces :**
- Consumes : `catalogueQuote`, `isPartnerBookable` (tâches 2 et 4) ; `liveCataloguesForPartners` (tâche 4) ; `DbPartner` de `src/lib/car-partners-db.ts`.
- Produces :
  - `QuoteOption.source: "quote" | "catalogue"`
  - `export function planFanOut(input: { enabled: boolean; partners: Array<DbPartner & { terms_version: string | null; terms_accepted_at: string | null; default_insurance_type: string | null; default_excess_eur: number | null; default_zero_excess_upsell_eur_day: number | null }>; catalogues: Map<number, { rates: RateRow[]; conditions: CatalogueConditions | null }>; req: CatalogueRequest }): { catalogue: Array<{ partnerId: number; total: number; carModel: string | null; gearbox: string | null; inclusions: string[]; insuranceType: string | null; excessEur: number | null; zeroExcessUpsellEurDay: number | null; note: string | null }>; quote: number[] }`
  - Réponse de `POST /api/car-rental/submit` : `{ ok: true, offerUrl?: string }`

Règles de `planFanOut` :
- Interrupteur éteint : `catalogue` vide, `quote` = tous les partenaires éligibles (comportement actuel).
- Interrupteur allumé : les loueurs non réservables (`isPartnerBookable` faux) et ceux en `lead_routing = 'relay'` (aucun lien pour confirmer, spec section 9) sont exclus des deux listes. Un loueur dont la grille couvre la demande va dans `catalogue`, les autres dans `quote`.
- `note` = `conditions.cancellation_terms`.

- [ ] **Step 1 : tests de `planFanOut`** : interrupteur éteint → `catalogue: []` et tous les partenaires dans `quote` ; allumé → un loueur avec grille couvrante dans `catalogue` avec `total` exact (reprendre le cas à 320 de la tâche 2), un loueur sans grille dans `quote`, un loueur avec `terms_version` null absent des deux, un loueur `relay` absent des deux.
- [ ] **Step 2 :** `npx vitest run src/lib/car-catalogue.test.ts` → échec.
- [ ] **Step 3 : implémenter `planFanOut`** (pur), puis le brancher dans `submit`.
  - Garder tous les contrôles actuels.
  - Pour chaque entrée `catalogue` : insérer un `car_quote_invites` (`status: 'quoted'`, `quoted_at: now()`, `quote_token_hash: hashToken(newToken())` jamais envoyé, `quote_price: total`), puis une ligne `car_quote_options` (`source: 'catalogue'`).
  - Aucune notification au loueur.
  - S'il y a au moins une offre de grille, la demande passe à `quoted` et la réponse porte `offerUrl` = `${siteBase()}/${locale}/car-offer/${clientToken}`.
  - Le chemin `quote` reste celui d'aujourd'hui.
  - Le message ops « Demande voiture entrante » dit combien d'offres de grille et combien de demandes de devis.
- [ ] **Step 4 : redirection dans l'assistant** : si `json.offerUrl` est présent, `window.location.assign(json.offerUrl)` après les événements Plausible existants. Sinon, l'écran « sent » d'aujourd'hui.
- [ ] **Step 5 :** `npx vitest run src/lib/car-catalogue.test.ts && npx tsc --noEmit` → vert.
- [ ] **Step 6 : commit** `feat(car): offres instantanées depuis les grilles publiées`.

---

### Task 7 : prix « à partir de » à l'étape catégorie

**Files :**
- Create : `src/app/api/car-rental/catalogue-from/route.ts`, `src/app/api/car-rental/catalogue-from/route.test.ts`
- Modify : `src/components/car-rental/CarRentalWizard.tsx` (cartes de l'étape 3), `src/components/car-rental/CarPriceEstimate.tsx` (masquée quand un prix réel existe pour la catégorie choisie)

**Interfaces :**
- Consumes : `fromPricePerDay`, `isPartnerBookable` (tâches 2 et 4), `zoneForPickup` (dans l'assistant), `partnersForZone`, `liveCataloguesForPartners`.
- Produces : `GET /api/car-rental/catalogue-from?pickup=&dateFrom=&dateTo=&timeFrom=&timeTo=` → `{ prices: Partial<Record<CarCategory, number>> }`. Interrupteur éteint → `{ prices: {} }`. En-tête `Cache-Control: private, max-age=300`.

- [ ] **Step 1 : tests de route** : interrupteur éteint → `{ prices: {} }` sans lecture en base ; allumé avec deux loueurs réservables à 50 et 47 €/j en `compact` → `prices.compact === 47` ; paramètres invalides → 400.
- [ ] **Step 2 :** test rouge, puis implémentation, puis test vert (`npx vitest run src/app/api/car-rental/catalogue-from`).
- [ ] **Step 3 : assistant.** À l'entrée de l'étape 3, appeler la route une fois par jeu (pickup, dates, heures). Une catégorie avec un prix affiche « from X €/day » (libellé traduit dans l'objet `T` des 4 langues : en « from », fr « à partir de », de « ab », el « από »). Sans prix réel, `CarPriceEstimate` reste telle quelle.
- [ ] **Step 4 :** `npx tsc --noEmit` → vert.
- [ ] **Step 5 : commit** `feat(car): prix réels à partir de, par catégorie`.

---

### Task 8 : choisir une offre, payer l'acompte

**Files :**
- Create : `src/lib/car-deposit-server.ts`, `src/lib/car-deposit-server.test.ts`
- Modify : `src/app/api/car-rental/accept/route.ts`, `src/app/api/car-rental/booking/route.ts` (+ son test), `src/app/[locale]/car-booking/[token]/page.tsx`, `BookingPanel.tsx`, `src/app/[locale]/car-booking/content.ts`, `src/app/[locale]/car-offer/[token]/page.tsx`

**Interfaces :**
- Consumes : `depositEur`, `isBookableOnline`, `athensWallToUtcMs`, `buildDepositCheckoutParams` (tâches 2 et 3) ; `stripeClient` ; `classifyStripeFailure`, `stripeLogFields`.
- Produces :
  - `export async function startDeposit(requestId: number, option: QuoteOption, locale: string, nowMs: number): Promise<{ payUrl: string } | { error: "too_close" | "below_minimum" | "in_progress" }>`
  - Route `POST /api/car-rental/booking` réécrite pour l'acompte : même verrou optimiste (`booking_status` null → `pending_payment`), session créée par `buildDepositCheckoutParams` avec `depositEur` lu sur la demande (jamais recalculé depuis la grille).

Effets de `startDeposit`, interrupteur allumé :
- Refus `in_progress` si `booking_status` vaut `pending_payment`, `awaiting_partner` ou `confirmed`.
- Refus `too_close` si `!isBookableOnline(nowMs, athensWallToUtcMs(date_from, time_from))`.
- Sinon, il écrit sur `car_requests` :
  - la copie figée de l'option : `quoted_price`, `quoted_car_model`, `quoted_inclusions`, `quoted_insurance_type`, `quoted_excess_eur`, `quoted_zero_excess_upsell_eur_day`, `quoted_by_partner_id`, `partner_name`, `quoted_at` ;
  - `deposit_option_id = option.id`, `deposit_rate = partner.commission`, `deposit_eur = depositEur(option.price, rate)` ;
  - `booking_token_hash`, `booking_status: null`.
- `status` ne change PAS : la demande reste `quoted` jusqu'au paiement.

Dans `accept/route.ts`, interrupteur allumé : `startDeposit` remplace `startBookingAfterAccept`, et rien de ce qui suit n'est exécuté (pas de passage en `accepted`, pas de mise à jour des invitations, pas de `sendConnectionEmails`). Réponses : `{ ok: true, payUrl }`, 409 `{ inProgress: true }`, 409 `{ tooClose: true }`, 409 `{ belowMinimum: true }`. Le contrôle du téléphone reste avant.

- [ ] **Step 1 : tests de `startDeposit`** (supabase moqué) :
  - snapshot écrit avec `deposit_eur: 41.2` pour une option à 412 et un taux de 0,1 ;
  - `status` absent du patch ;
  - `in_progress` quand `booking_status` vaut `awaiting_partner` ;
  - `too_close` pour une prise dans 3 h ;
  - `below_minimum` pour une option à 4 €.
- [ ] **Step 2 : test de la route booking** : la session est créée avec `unit_amount: 4120`, lu sur `deposit_eur` de la demande même si la grille a changé depuis (Review Focus 3) ; un second appel pendant `pending_payment` rend 409 (Review Focus 1).
- [ ] **Step 3 :** `npx vitest run src/lib/car-deposit-server.test.ts src/app/api/car-rental/booking/route.test.ts` → échec.
- [ ] **Step 4 : implémenter** `startDeposit`, la branche d'`accept` et la route booking. Tests verts.
- [ ] **Step 5 : page de réservation** `/[locale]/car-booking/[token]`, une vue par état, textes dans `content.ts` pour les 4 langues :
  - `null` : récapitulatif avec total, acompte, reste au comptoir, assurance, règle d'annulation 48 h, « confirmée sous 4 h d'ouverture, sinon remboursée intégralement », et bouton « Payer {acompte} » ;
  - `pending_payment` : paiement en cours ;
  - `awaiting_partner` : en attente de {loueur}, au plus tard {heure d'Athènes} ;
  - `confirmed` : réservation confirmée, avec les coordonnées du loueur ;
  - `refunded` : remboursé, motif, et lien vers les autres offres ;
  - `cancelled_kept` : annulée, acompte gardé.
  Au retour `?paid=1`, envoyer l'événement Plausible `car_deposit_paid`.
- [ ] **Step 6 : page d'offres.**
  - Chaque offre montre le total, « {acompte} aujourd'hui · {reste} au comptoir », et « Confirmée sous 4 h, sinon remboursée ».
  - Une offre non réservable montre « Trop proche du départ pour réserver en ligne », sans bouton.
  - Les options dont l'invitation est `declined` sont grisées.
  - `AcceptButton` suit `payUrl` comme aujourd'hui et affiche les refus `inProgress` et `tooClose`.
- [ ] **Step 7 :** `npx vitest run src/lib src/app/api/car-rental && npx tsc --noEmit` → vert.
- [ ] **Step 8 : commit** `feat(car): acompte en ligne au choix d'une offre`.

---

### Task 9 : paiement reçu, confirmation du loueur, remboursement

**Files :**
- Create : `src/lib/car-deposit-mail.ts`, `src/lib/car-deposit-mail.test.ts`, `src/app/[locale]/car-confirm/[token]/page.tsx`, `src/app/[locale]/car-confirm/[token]/ConfirmButtons.tsx`, `src/app/api/car-rental/confirm/route.ts`, `src/app/api/car-rental/confirm/route.test.ts`
- Modify : `src/lib/car-deposit-server.ts` (+ tests), `src/app/api/car-rental/commission/webhook/route.ts` (+ son test), `src/lib/email.ts` (un envoyeur générique)

**Interfaces :**
- Consumes : `confirmDeadlineMs`, `shouldSuspendPartner`, `RefundReason` (tâche 3) ; `notifyOps` ; `stripeClient`.
- Produces dans `car-deposit-server.ts` :
  - `onDepositPaid(requestId: number, sessionId: string, paymentIntentId: string, nowMs: number): Promise<"recorded" | "session_mismatch">`
  - `onDepositSessionExpired(requestId: number, sessionId: string): Promise<void>` : remet `booking_status` à null si la session est celle de la demande et toujours `pending_payment`
  - `confirmBooking(requestId: number, by: "partner" | "admin"): Promise<"confirmed" | "already_confirmed" | "not_awaiting">`
  - `releaseBooking(requestId: number, reason: RefundReason, nowMs: number): Promise<"refunded" | "not_releasable">` : rembourse un acompte non confirmé
  - `refundConfirmed(requestId: number, reason: "partner_cancelled" | "ops"): Promise<"refunded" | "not_refundable">` : rembourse après confirmation et émet l'avoir si une facture existe (`creditInvoice`)
  - `bookingByConfirmToken(token: string)`
- Produces dans `car-deposit-mail.ts` (pur, testé) : `depositMail(kind: "client_pending" | "partner_request" | "partner_reminder" | "client_confirmed" | "partner_confirmed" | "client_refunded" | "partner_client_cancelled" | "client_cancelled", data: DepositMailData, locale: string): { subject: string; html: string }`. E-mails loueur en anglais ; e-mails client dans la locale de la demande.
- `email.ts` : `sendCarDepositMail(to: string, mail: { subject: string; html: string }): Promise<boolean>` (lit `error` de Resend).

Effets :

- `onDepositPaid`. Si `sessionId !== booking_session_id` : rembourser ce paiement, alerte ops, rendre `session_mismatch` (Review Focus 4). Sinon :
  - écrire `booking_status: 'awaiting_partner'`, `booking_paid_at`, `booking_payment_intent_id`, `confirm_deadline_at = confirmDeadlineMs(nowMs)`, `partner_confirm_token = newToken()` ;
  - passer la demande en `status: 'accepted'` avec `accepted_at` ;
  - l'invitation de l'option payée passe `chosen`, les autres invitations `quoted` passent `not_chosen` ;
  - envoyer `client_pending` et `partner_request` (liens `/en/car-confirm/{token}`), puis l'alerte ops « Acompte voiture payé : {loueur} doit confirmer avant {heure} ».
- `confirmBooking` : seulement depuis `awaiting_partner`.
  - Effets : `booking_status: 'confirmed'`, `partner_confirmed_at` ; e-mails `client_confirmed` (avec les coordonnées du loueur) et `partner_confirmed` (avec les coordonnées du client).
  - Rend `already_confirmed` si déjà confirmée, `not_awaiting` après un remboursement (Review Focus 2).
- `releaseBooking` : seulement depuis `awaiting_partner`.
  - Rembourse via `refunds.create({ payment_intent })` et écrit `booking_status: 'refunded'`, `refund_reason`, `refund_id`, `refund_amount_eur`.
  - Remet la demande en `status: 'quoted'` avec `accepted_at: null` et `booking_token_hash: null`. L'invitation choisie passe `declined` ; les invitations `not_chosen` repassent `quoted`.
  - Envoie `client_refunded` avec le lien de la page d'offres.
  - Compte les manquements du loueur sur 30 jours (`refund_reason` parmi `partner_declined`, `partner_timeout`, `partner_cancelled`). Si `shouldSuspendPartner`, passer la grille en `rates_status: 'paused'` et envoyer une alerte ops.
- Webhook :
  - accepter `car_deposit` en plus de `car_commission` et `car_booking` ;
  - `checkout.session.completed` → `onDepositPaid` ;
  - `checkout.session.expired` → `onDepositSessionExpired`.

- [ ] **Step 1 : tests de `car-deposit-server`** :
  - `onDepositPaid` écrit l'échéance attendue pour un paiement à 21:30 heure d'Athènes ;
  - `onDepositPaid` avec une session étrangère rembourse et n'écrit pas `awaiting_partner` ;
  - `confirmBooking` deux fois → `already_confirmed` au second appel, un seul envoi d'e-mails ;
  - `confirmBooking` après `releaseBooking` → `not_awaiting` ;
  - `releaseBooking` remet les invitations comme décrit et appelle `refunds.create` une fois ;
  - au 3e manquement en 30 jours, la grille passe `paused`.
- [ ] **Step 2 : test du webhook** : `car_deposit` + `completed` appelle `onDepositPaid` ; un événement en double est ignoré par le registre.
- [ ] **Step 3 : test de `depositMail`** : `client_pending` en fr contient le montant (« 41,20 € »), le nom du loueur et l'heure d'échéance ; `partner_request` contient le montant à encaisser au comptoir, sans aucune coordonnée du client ; `client_confirmed` contient le téléphone du loueur. Aucun texte ne contient le caractère U+2014.
- [ ] **Step 4 :** tests rouges, implémentation, tests verts (`npx vitest run src/lib/car-deposit-server.test.ts src/lib/car-deposit-mail.test.ts src/app/api/car-rental/commission/webhook src/app/api/car-rental/confirm`).
- [ ] **Step 5 : page loueur** `/[locale]/car-confirm/[token]` (anglais) : récapitulatif sans coordonnées du client, échéance, boutons « Confirm » et « Not available ». La route `POST /api/car-rental/confirm` (`{ token, decision: "confirm" | "decline" }`) appelle `confirmBooking` ou `releaseBooking(…, "partner_declined")` et rend l'état final. La page affiche cet état, y compris « expired, the client was refunded ».
- [ ] **Step 6 :** `npx tsc --noEmit` → vert.
- [ ] **Step 7 : commit** `feat(car): confirmation du loueur et remboursement automatique`.

---

### Task 10 : échéances et rappels

**Files :**
- Create : `src/app/api/cron/car-deposit-deadline/route.ts`, `src/app/api/cron/car-deposit-deadline/route.test.ts`
- Modify : `vercel.json`

**Interfaces :**
- Consumes : `releaseBooking`, `reminderDueMs`, `depositMail("partner_reminder")`, `assertCron`.
- Produces : `GET /api/cron/car-deposit-deadline` → `{ ok: true, released: number, reminded: number }`.

Le cron, sur les demandes `booking_status = 'awaiting_partner'` :
- `confirm_deadline_at` dépassé → `releaseBooking(id, "partner_timeout", now)` ;
- sinon, milieu du délai passé et `confirm_reminded_at` nul → envoyer le rappel au loueur et écrire `confirm_reminded_at`.

Il ne touche jamais `pending_payment` : c'est l'expiration de session Stripe, par webhook, qui libère.

- [ ] **Step 1 : tests** :
  - une demande échue est libérée ;
  - une demande à mi-délai reçoit un rappel, une seule fois ;
  - une demande `pending_payment` vieille de 2 h n'est pas touchée ;
  - un appel sans secret de cron → 401.
- [ ] **Step 2 :** rouge, implémentation, vert (`npx vitest run src/app/api/cron/car-deposit-deadline`).
- [ ] **Step 3 :** ajouter `{ "path": "/api/cron/car-deposit-deadline", "schedule": "*/15 * * * *" }` à `vercel.json`. Si Vercel refuse cette fréquence au déploiement, `"5 * * * *"`, et noter le retard maximal d'une heure dans le message de commit.
- [ ] **Step 4 : commit** `feat(car): échéances de confirmation et rappels`.

---

### Task 11 : annulation par le client

**Files :**
- Modify : `src/app/api/car-rental/booking/cancel/route.ts` (+ son test), `src/app/[locale]/car-booking/[token]/CancelPanel.tsx`, `src/lib/car-deposit-server.ts` (+ tests)

**Interfaces :**
- Consumes : `clientCancelRefundEur`, `athensWallToUtcMs` (tâche 3) ; `depositMail("client_cancelled" | "partner_client_cancelled")`.
- Produces : `cancelByClient(requestId: number, nowMs: number): Promise<{ refundedEur: number; status: "refunded" | "cancelled_kept" } | { error: "not_cancellable" }>`.

Selon l'état et l'heure de prise :
- `awaiting_partner`, ou `confirmed` à 48 h ou plus de la prise : remboursement intégral, `booking_status: 'refunded'`, `refund_reason: 'client_cancelled'`.
- `confirmed` à moins de 48 h : `booking_status: 'cancelled_kept'`, `cancelled_at`.

Dans les deux cas, le loueur reçoit `partner_client_cancelled` et le client `client_cancelled`.

- [ ] **Step 1 : tests de `cancelByClient`** :
  - `awaiting_partner` à 3 h de la prise → remboursé ;
  - `confirmed` à 48 h pile → remboursé ;
  - `confirmed` à 47 h → `cancelled_kept`, aucun appel à `refunds.create` ;
  - `refunded` → `not_cancellable`.
- [ ] **Step 2 :** rouge, implémentation (la route lit le jeton de réservation comme aujourd'hui, puis appelle `cancelByClient`), vert.
- [ ] **Step 3 : `CancelPanel`** : affiche avant le clic ce que le client récupère (montant ou 0 €), dans les 4 langues.
- [ ] **Step 4 :** `npx vitest run src/lib/car-deposit-server.test.ts src/app/api/car-rental/booking && npx tsc --noEmit` → vert.
- [ ] **Step 5 : commit** `feat(car): annulation client, gratuite jusqu'à 48 h`.

---

### Task 12 : facture réglée par compensation au premier jour

**Files :**
- Create : `src/lib/car-deposit-invoice.ts`, `src/lib/car-deposit-invoice.test.ts`
- Modify : `src/app/api/cron/car-outcome-followup/route.ts`, `src/app/[locale]/invoice/[token]/page.tsx` (+ son test), `src/lib/car-deposit-mail.ts` (type `partner_invoice`)

**Interfaces :**
- Consumes : `createInvoiceForRequest`, `markInvoicePaid`, `assertWritten` de `src/lib/car-invoice-server.ts` ; `partnerBillingIdentity` ; `invoiceAmounts`.
- Produces :
  - `runDepositInvoicePass(todayIso: string): Promise<{ invoiced: number; failed: number[] }>` ;
  - `runRatesExpiryReminderPass(todayIso: string): Promise<{ reminded: number }>` (spec section 6). Il vise les grilles `live` dont la dernière `period_to` tombe dans 30 jours ou moins et dont `rates_expiry_reminded_at` est nul. Il envoie au loueur un e-mail `partner_rates_expiring` (nouveau type de `depositMail`) avec le lien du portail, puis écrit `rates_expiry_reminded_at`. `replaceRates` remet cette colonne à null.

Sélection : `booking_status` dans (`confirmed`, `cancelled_kept`), `date_from <= today`, aucune facture.

Pour chaque demande :
- `createInvoiceForRequest({ requestId, partnerId, base: quoted_price, rate: deposit_rate, amount: deposit_eur })` ;
- `settlement: 'deposit_compensation'` sur la facture, puis `markInvoicePaid(requestId)` ;
- e-mail `partner_invoice` au loueur : la facture, marquée réglée, avec son lien. Aucune demande de paiement.

En cas d'échec, l'id va dans `failed` et une alerte ops part.

- [ ] **Step 1 : tests** :
  - une réservation `confirmed` dont la prise est aujourd'hui est facturée et marquée payée ;
  - une prise demain n'est pas facturée ;
  - une demande déjà facturée n'est pas refacturée ;
  - `cancelled_kept` est facturée comme une location.
  Tests de `runRatesExpiryReminderPass` : une grille qui finit dans 30 jours reçoit un rappel, une seule fois ; une grille qui finit dans 31 jours n'en reçoit pas.
  Test de la page facture : `settlement = 'deposit_compensation'` affiche « Paid by offset against the deposit collected on {date} » et aucun bouton de paiement.
- [ ] **Step 2 :** rouge, implémentation, vert.
- [ ] **Step 3 :** le cron `car-outcome-followup` appelle `runDepositInvoicePass` puis `runRatesExpiryReminderPass` avant ses passes actuelles. La sélection de la relance d'issue exclut `booking_status` non nul : aucune réservation avec acompte n'entre dans la relance.
- [ ] **Step 4 :** `npx vitest run src/lib/car-deposit-invoice.test.ts "src/app/[locale]/invoice" src/app/api/cron/car-outcome-followup && npx tsc --noEmit` → vert.
- [ ] **Step 5 : commit** `feat(car): facture de commission réglée par compensation`.

---

### Task 13 : admin, actions ops et indicateurs

**Files :**
- Modify : `src/app/admin/car-rental/actions.ts` (+ `actions.test.ts`), `src/app/admin/car-rental/requests-table.tsx`, `src/lib/car-monitoring.ts` (+ tests), le composant de la bande KPI

**Interfaces :**
- Consumes : `confirmBooking`, `releaseBooking`, `refundConfirmed` (tâche 9).
- Produces :
  - actions serveur `adminConfirmDeposit(requestId)`, `adminDeclineDeposit(requestId)` (`releaseBooking` avec le motif `ops`), `adminExtendDeadline(requestId, hours: 1 | 2 | 4)`, `adminRefundConfirmed(requestId, reason: "partner_cancelled" | "ops")` ;
  - `depositKpis(rows): { catalogueCoverage: number; offerToDeposit: number; confirmRate: number; medianConfirmMinutes: number | null; refundsByReason: Record<RefundReason, number>; commissionEur: number }`.

- [ ] **Step 1 : tests.**
  - Chaque action refuse sans `isCarAdmin()`.
  - `adminExtendDeadline` repousse `confirm_deadline_at` du nombre d'heures demandé.
  - `depositKpis`, sur un jeu de 5 demandes écrit dans le test :
    - couverture = demandes avec au moins une option `catalogue` / demandes ;
    - taux de confirmation = `confirmed` + `cancelled_kept` / acomptes payés ;
    - commission = somme de `deposit_eur` des réservations `confirmed` et `cancelled_kept`.
- [ ] **Step 2 :** rouge, implémentation, vert (`npx vitest run src/app/admin/car-rental src/lib/car-monitoring`).
- [ ] **Step 3 : tableau des demandes** : état de l'acompte, échéance (heure d'Athènes), et boutons selon l'état (confirmer, refuser, prolonger, rembourser). La bande KPI affiche les 6 indicateurs.
- [ ] **Step 4 :** `npx tsc --noEmit` → vert.
- [ ] **Step 5 : commit** `feat(car): pilotage des acomptes dans l'admin`.

---

### Task 14 : grilles amorcées depuis les devis 2026

**Files :**
- Create : `scripts/sql/seed-car-rates-2027.sql`

Le script insère, pour chaque loueur actif, des lignes en `draft` :
- La médiane du prix par jour (`price / greatest(1, date_to - date_from)`) des options de devis, groupée par (loueur, `car_requests.car_type`, saison du mois de `date_from`). Saisons : 7-8 pic, 6 et 9 haute, 5 et 10 intermédiaire.
- Seulement les groupes d'au moins 2 devis, avec un prix ≥ 10 €/j.
- Périodes 2027 :
  - pic : `2027-07-01` → `2027-08-31` ;
  - haute : `2027-06-01` → `2027-06-30` et `2027-09-01` → `2027-09-30` ;
  - intermédiaire : `2027-05-01` → `2027-05-31` et `2027-10-01` → `2027-10-31`.
- `min_days = 3`, `source = 'devis 2026, médiane de N'`. Un loueur qui reçoit des lignes passe en `rates_status = 'draft'` s'il était `none`.
- `on conflict do nothing`, pour pouvoir relancer le script sans doublon.

- [ ] **Step 1 : écrire le script** dans une transaction.
- [ ] **Step 2 : essai à blanc sur la prod** (`begin; … ; rollback;`, comme à la tâche 1), avec une requête de comptage avant le `rollback` : nombre de lignes par loueur. Attendu : des lignes pour la plupart des 10 loueurs actifs, aucune erreur.
- [ ] **Step 3 : appliquer**, puis vérifier : `select rates_status, count(*) from car_partners where active group by 1;` montre des `draft` et aucun `live`.
- [ ] **Step 4 : commit** `chore(car): grilles 2027 amorcées depuis les devis 2026`.

---

### Task 15 : retrait du paiement total de juillet

**Files :**
- Delete : `src/app/api/cron/car-transfers/` (route et test), `src/lib/car-connect-server.ts` (+ test)
- Modify : `vercel.json` (retirer `car-transfers`), `src/lib/car-booking.ts` (garder seulement ce qui sert encore, s'il en reste), `src/lib/car-booking-server.ts` (`startBookingAfterAccept`, `notifyBookingPaid` retirés), `src/lib/booking-policy.ts` (garder `REFUND_WINDOW_HOURS`, retirer option à 5 € et versement), `src/app/admin/car-rental/actions.ts` (`openPartnerOnboarding`, `refreshPartnerConnect` retirées), webhook (branche `car_booking` retirée), `package.json` (scripts `check:` qui testent du code retiré)

- [ ] **Step 1 :** `grep -rn "CAR_BOOKING_ENABLED\|startBookingAfterAccept\|notifyBookingPaid\|bookingBreakdownCents\|buildBookingCheckoutParams\|transferDueAt\|shouldTransferNow\|CANCELLATION_OPTION_EUR\|startPartnerOnboarding\|refreshPartnerKyc" src scripts vercel.json package.json` : tout ce qui sort est retiré, ou réécrit si le parcours d'acompte s'en sert encore. Les colonnes en base restent (aucune migration destructive).
- [ ] **Step 2 :** `npm test && npm run check` → vert. La liste `check` ne référence plus aucun script supprimé.
- [ ] **Step 3 : commit** `refactor(car): un seul chemin de paiement, l'acompte`.

---

### Task 16 : vérification d'ensemble et livraison

- [ ] **Step 1 : aperçu des e-mails pour François.** Un script `scripts/preview-car-deposit-mails.mjs` écrit chaque `depositMail` (8 types plus `partner_invoice`, client en en, fr, de et el) en HTML dans `docs/mockups/car-deposit-mails/`. Ouvrir trois rendus avec `shot.py` (mobile et ordinateur) et les regarder avant de les montrer.
- [ ] **Step 2 : parcours complet en mode test Stripe.** Avec les clés de test dans `.env.local` (jamais commitées), un `npm run dev` lancé en arrière-plan sur un port libre, et `stripe listen --forward-to localhost:<port>/api/car-rental/commission/webhook`, enchaîner :
  - formulaire, offre de grille, paiement (carte 4242), page « en attente » ;
  - confirmation par le lien loueur, puis annulation client à plus de 48 h, avec remboursement visible dans le tableau de bord de test ;
  - second passage : l'échéance dépassée (prolonger l'heure à la main en base de test) libère et rembourse.
  Relever les identifiants `cs_test_` et `re_` dans le compte rendu.
- [ ] **Step 3 :** `npm test && npm run check && npx next build` → tout vert, compter les tests.
- [ ] **Step 4 :** `npm run ship` depuis `feat/car-catalogue`. Le code part en prod au déploiement de 20 h, interrupteur éteint.

## Mise en service (gestes humains, hors code)

1. François relit les aperçus d'e-mails et la page de conditions.
2. Courrier aux 10 loueurs actifs : grille à vérifier et nouvelles conditions, lien de portail personnel. Texte validé par François, signé Kami, envoyé par `send-crete-direct.mjs`.
3. ⛔ Validation comptable de la décision 5 de la spec, avant l'allumage.
4. Un paiement réel de bout en bout, remboursé.
5. Allumage `CAR_CATALOGUE_ENABLED=on` par François, quand au moins 5 grilles sont publiées. Cible : avant le 01/04/2027.
