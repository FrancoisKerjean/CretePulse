# Car Rental Direct — Multi-devis — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer le first-come (1er loueur qui chiffre gagne, 1 offre au client) par un modèle multi-devis (le client reçoit toutes les offres et choisit ; Kami voit tout dans `/admin/car-rental`), avec relances auto et désistements des deux côtés.

**Architecture:** Les devis quittent les colonnes `quoted_*` de `car_requests` (mono-offre) pour vivre sur `car_quote_invites` (1 ligne/loueur, statut `invited→quoted→chosen/not_chosen`/`declined`). Le verrou first-come est retiré. Au CHOIX, le devis retenu est copié en snapshot sur `car_requests.quoted_*` → l'admin, les commissions et l'expiry existants tournent sans réécriture.

**Tech Stack:** Next.js App Router (route handlers), Supabase (Postgres self-host VPS `cretepulse-postgres`), TypeScript, node `--experimental-strip-types` pour les checks purs.

**Spec:** `docs/superpowers/specs/2026-07-08-car-rental-multi-quote-design.md`

**Contexte d'exécution :** worktree `cp-multiquote`, branche `feat/car-multi-quote`. Git author **kerjeanfrancois29** (sinon Vercel bloque). Jamais de commit direct sur `master`/`main`. Déploiement = `git push origin feat/car-multi-quote:master` puis `:main` (acte conscient). **tsc vert avant tout push.** Migrations appliquées sur la DB VPS via `ssh kairos-vps "docker exec cretepulse-postgres psql -U postgres -d cretepulse -c '<SQL>'"`. **Test e2e = loueurs test uniquement (active=false ou zone de test), JAMAIS une vraie demande live** (leçon 04/07 : un submit live spamme les vrais loueurs).

---

## File Structure

**Créés :**
- `supabase/migrations/20260708_car_multi_quote.sql` — colonnes statut/devis/relance.
- `src/lib/car-quotes.ts` — logique PURE (tri, choix, éligibilité relance, transitions). Zéro I/O.
- `src/lib/car-quotes-db.ts` — lectures I/O (`quotesForRequest`, `requestByClientToken`).
- `scripts/check-car-quotes.mjs` — tests purs de `car-quotes.ts`.

**Modifiés :**
- `src/app/api/car-rental/submit/route.ts` — génère `accept_token_hash` à la création.
- `src/app/api/car-rental/quote/route.ts` — retire le verrou first-come, écrit le devis sur l'invite, notifie le client ; (P2) désistement loueur `?decline=1`.
- `src/app/api/car-rental/accept/route.ts` — choix d'une invite précise, snapshot, statuts chosen/not_chosen, email loser ; (P2) décline client `?decline=1`.
- `src/app/[locale]/car-offer/[token]/page.tsx` + `AcceptButton.tsx` — liste multi-offres, bouton Choisir par offre ; (P2) bouton « aucune ne convient ».
- `src/app/[locale]/car-quote/[token]/QuoteForm.tsx` — (P2) bouton « je ne peux pas ».
- `src/lib/car-admin.ts` — type `AdminQuote`, stats `won` via `chosen`.
- `src/app/admin/car-rental/page.tsx` + `requests-table.tsx` — devis par demande + choix surligné.
- `src/lib/email.ts` — `sendPartnerNotChosen` (P1), `sendCustomerNewOffer`/`sendPartnerRelance`/`sendCustomerRelance` (P2).
- `src/app/api/cron/car-relance/route.ts` — (P2) créé.
- `vercel.json` — (P2) cron `car-relance`.

---

# PHASE 1 — Multi-devis + choix client + admin

## Task 1 — Migration multi-devis

**Files:**
- Create: `supabase/migrations/20260708_car_multi_quote.sql`

- [ ] **Step 1: Écrire la migration**

```sql
-- Devis multiples : chaque loueur invité porte SON devis + statut, au lieu du
-- devis gagnant unique sur car_requests (modèle first-come remplacé).
ALTER TABLE car_quote_invites
  ADD COLUMN IF NOT EXISTS status           text NOT NULL DEFAULT 'invited',
  ADD COLUMN IF NOT EXISTS quote_price      numeric,
  ADD COLUMN IF NOT EXISTS quote_currency   text,
  ADD COLUMN IF NOT EXISTS quote_car_model  text,
  ADD COLUMN IF NOT EXISTS quote_inclusions jsonb,
  ADD COLUMN IF NOT EXISTS quoted_at        timestamptz,
  ADD COLUMN IF NOT EXISTS declined_at      timestamptz,
  ADD COLUMN IF NOT EXISTS relanced_at      timestamptz;

CREATE INDEX IF NOT EXISTS idx_car_quote_invites_request ON car_quote_invites (request_id);

ALTER TABLE car_requests
  ADD COLUMN IF NOT EXISTS client_relanced_at   timestamptz,
  ADD COLUMN IF NOT EXISTS client_relance_count int NOT NULL DEFAULT 0;
```

- [ ] **Step 2: Appliquer sur la DB VPS**

Run:
```bash
ssh kairos-vps "docker exec cretepulse-postgres psql -U postgres -d cretepulse -c \"$(cat supabase/migrations/20260708_car_multi_quote.sql | tr '\n' ' ')\""
```
Expected: `ALTER TABLE` / `CREATE INDEX` (pas d'erreur). Idempotent (`IF NOT EXISTS`).

- [ ] **Step 3: Vérifier les colonnes**

Run:
```bash
ssh kairos-vps "docker exec cretepulse-postgres psql -U postgres -d cretepulse -t -c \"select column_name from information_schema.columns where table_name='car_quote_invites' and column_name in ('status','quote_price','declined_at','relanced_at');\""
```
Expected: 4 lignes.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260708_car_multi_quote.sql
git -c user.name=kerjeanfrancois29 -c user.email=kerjeanfrancois29@gmail.com commit -m "feat(car): migration multi-devis (statut + prix par invite)"
```

## Task 2 — Module pur `car-quotes.ts` + tests (TDD)

**Files:**
- Create: `src/lib/car-quotes.ts`
- Test: `scripts/check-car-quotes.mjs`

- [ ] **Step 1: Écrire le test qui échoue** (`scripts/check-car-quotes.mjs`)

```js
// node --experimental-strip-types scripts/check-car-quotes.mjs
import { sortQuotesByPrice, canPartnerQuote, findChosenInvite, partnerNeedsRelance, clientNeedsRelance } from "../src/lib/car-quotes.ts";

let fail = 0;
const ok = (n, c) => { console.log(c ? `ok - ${n}` : `FAIL - ${n}`); if (!c) fail++; };

const q = (id, price, status = "quoted") => ({ id, partner_id: id, partner_name: `P${id}`, status, quote_price: price, quoted_at: "2026-07-08T10:00:00Z" });

// tri par prix croissant, ne garde que les devis chiffrés
ok("tri par prix croissant", (() => { const s = sortQuotesByPrice([q(1, 300), q(2, 200), q(3, 250)]); return s.map(x => x.id).join() === "2,3,1"; })());
ok("exclut les non-chiffres du tri", (() => { const s = sortQuotesByPrice([q(1, 300), q(2, null, "invited"), q(3, 200, "declined")]); return s.length === 1 && s[0].id === 1; })());

// un loueur peut chiffrer si la demande est ouverte
ok("peut chiffrer sur demande sent", canPartnerQuote("sent") === true);
ok("peut chiffrer sur demande quoted", canPartnerQuote("quoted") === true);
ok("ne peut pas chiffrer sur accepted", canPartnerQuote("accepted") === false);
ok("ne peut pas chiffrer sur declined_by_client", canPartnerQuote("declined_by_client") === false);

// choix : l'invite doit exister et avoir un devis
ok("choix valide", findChosenInvite([q(1, 300), q(2, 200)], 2)?.id === 2);
ok("choix d'une invite sans devis -> null", findChosenInvite([q(1, null, "invited")], 1) === null);
ok("choix d'une invite inexistante -> null", findChosenInvite([q(1, 300)], 99) === null);

// relance loueur : invité, pas chiffré/désisté, demande ouverte, >24h, jamais relancé
const H = 3600000;
ok("relance loueur due", partnerNeedsRelance({ status: "invited", relanced_at: null }, "quoted", 1751961600000, 1751961600000 - 25 * H));
ok("pas de relance si deja relance", !partnerNeedsRelance({ status: "invited", relanced_at: "x" }, "quoted", 1751961600000, 1751961600000 - 25 * H));
ok("pas de relance si <24h", !partnerNeedsRelance({ status: "invited", relanced_at: null }, "quoted", 1751961600000, 1751961600000 - 5 * H));
ok("pas de relance si deja chiffre", !partnerNeedsRelance({ status: "quoted", relanced_at: null }, "quoted", 1751961600000, 1751961600000 - 25 * H));
ok("pas de relance si demande fermee", !partnerNeedsRelance({ status: "invited", relanced_at: null }, "accepted", 1751961600000, 1751961600000 - 25 * H));

// relance client : a des offres (quoted), pas tranche, <2 relances, derniere >24h
ok("relance client due (jamais relance)", clientNeedsRelance({ status: "quoted", client_relanced_at: null, client_relance_count: 0 }, 1751961600000));
ok("pas de relance client si count>=2", !clientNeedsRelance({ status: "quoted", client_relanced_at: null, client_relance_count: 2 }, 1751961600000));
ok("pas de relance client si <24h depuis derniere", !clientNeedsRelance({ status: "quoted", client_relanced_at: new Date(1751961600000 - 5 * H).toISOString(), client_relance_count: 1 }, 1751961600000));
ok("pas de relance client si pas d'offre", !clientNeedsRelance({ status: "sent", client_relanced_at: null, client_relance_count: 0 }, 1751961600000));

console.log(fail ? `\n${fail} FAIL` : "\nAll passed");
process.exit(fail ? 1 : 0);
```

- [ ] **Step 2: Lancer le test → échec**

Run: `node --experimental-strip-types scripts/check-car-quotes.mjs`
Expected: FAIL (module `car-quotes.ts` inexistant).

- [ ] **Step 3: Écrire `src/lib/car-quotes.ts`**

```ts
// Logique PURE du modèle multi-devis (pattern car-lead.ts / car-admin.ts) :
// tri, sélection du choix, éligibilité des relances, transitions de statut.
// Zéro I/O. Importable par scripts/check-car-quotes.mjs.

export type InviteStatus = "invited" | "quoted" | "declined" | "chosen" | "not_chosen";

export interface QuoteInvite {
  id: number;
  partner_id: number;
  partner_name: string;
  status: InviteStatus;
  quote_price: number | null;
  quote_currency?: string | null;
  quote_car_model?: string | null;
  quote_inclusions?: string[] | null;
  quoted_at: string | null;
  relanced_at?: string | null;
}

const HOUR = 3600000;

/** Devis chiffrés (prix non nul), triés par prix croissant (meilleur prix en tête). */
export function sortQuotesByPrice(quotes: QuoteInvite[]): QuoteInvite[] {
  return quotes
    .filter((q) => q.quote_price != null && (q.status === "quoted" || q.status === "chosen" || q.status === "not_chosen"))
    .sort((a, b) => (a.quote_price! - b.quote_price!));
}

/** Un loueur peut chiffrer tant que la demande est ouverte. */
export function canPartnerQuote(requestStatus: string): boolean {
  return requestStatus === "sent" || requestStatus === "quoted";
}

/** L'invite choisie par le client : doit exister et porter un devis. Sinon null. */
export function findChosenInvite(quotes: QuoteInvite[], inviteId: number): QuoteInvite | null {
  const inv = quotes.find((q) => q.id === inviteId);
  return inv && inv.quote_price != null ? inv : null;
}

/** Relance loueur : invité, ni chiffré ni désisté, demande ouverte, >24h, jamais relancé. */
export function partnerNeedsRelance(
  invite: { status: string; relanced_at: string | null },
  requestStatus: string,
  nowMs: number,
  createdAtMs: number,
): boolean {
  if (invite.status !== "invited") return false;
  if (invite.relanced_at) return false;
  if (!canPartnerQuote(requestStatus)) return false;
  return nowMs - createdAtMs >= 24 * HOUR;
}

/** Relance client : a ≥1 offre (status quoted), non tranché, <2 relances, dernière >24h. */
export function clientNeedsRelance(
  req: { status: string; client_relanced_at: string | null; client_relance_count: number },
  nowMs: number,
): boolean {
  if (req.status !== "quoted") return false;
  if (req.client_relance_count >= 2) return false;
  if (req.client_relanced_at && nowMs - new Date(req.client_relanced_at).getTime() < 24 * HOUR) return false;
  return true;
}
```

- [ ] **Step 4: Lancer le test → succès**

Run: `node --experimental-strip-types scripts/check-car-quotes.mjs`
Expected: `All passed`, exit 0.

- [ ] **Step 5: Ajouter le script check au package.json**

Modifier `package.json`, dans `"scripts"`, après la ligne `"check:car-lead"` :
```json
    "check:car-quotes": "node --experimental-strip-types scripts/check-car-quotes.mjs",
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/car-quotes.ts scripts/check-car-quotes.mjs package.json
git -c user.name=kerjeanfrancois29 -c user.email=kerjeanfrancois29@gmail.com commit -m "feat(car): module pur car-quotes (tri/choix/relance) + tests"
```

## Task 3 — Lectures I/O `car-quotes-db.ts`

**Files:**
- Create: `src/lib/car-quotes-db.ts`

- [ ] **Step 1: Écrire le module** (pas de test unitaire — I/O, couvert e2e)

```ts
// Lectures Supabase du modèle multi-devis. La page offres et l'admin lisent ici.
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { hashToken } from "@/lib/car-quote";
import type { QuoteInvite } from "@/lib/car-quotes";

/** Tous les devis/invites d'une demande, avec le nom du loueur. */
export async function quotesForRequest(requestId: number): Promise<QuoteInvite[]> {
  const { data } = await supabase.from("car_quote_invites")
    .select("id, partner_id, status, quote_price, quote_currency, quote_car_model, quote_inclusions, quoted_at, relanced_at, car_partners(name)")
    .eq("request_id", requestId);
  return (data ?? []).map((r) => ({
    id: r.id, partner_id: r.partner_id,
    partner_name: (r as { car_partners?: { name?: string } }).car_partners?.name ?? "Agency",
    status: r.status, quote_price: r.quote_price, quote_currency: r.quote_currency,
    quote_car_model: r.quote_car_model, quote_inclusions: r.quote_inclusions,
    quoted_at: r.quoted_at, relanced_at: r.relanced_at,
  }));
}

/** Demande + ses devis à partir du token client (page offres). null si introuvable. */
export async function requestByClientToken(token: string): Promise<{ request: Record<string, unknown>; quotes: QuoteInvite[] } | null> {
  const { data: request } = await supabase.from("car_requests")
    .select("id, status, locale, pickup_slug, date_from, date_to, car_type, customer_name, customer_email")
    .eq("accept_token_hash", hashToken(token)).maybeSingle();
  if (!request) return null;
  const quotes = await quotesForRequest(request.id as number);
  return { request, quotes };
}
```

- [ ] **Step 2: tsc**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: 0 erreur sur `car-quotes-db.ts`. (Si la jointure `car_partners(name)` gêne le typage, caster via `as` comme montré.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/car-quotes-db.ts
git -c user.name=kerjeanfrancois29 -c user.email=kerjeanfrancois29@gmail.com commit -m "feat(car): lectures multi-devis (quotesForRequest, requestByClientToken)"
```

## Task 4 — `submit` génère le token client à la création

**Files:**
- Modify: `src/app/api/car-rental/submit/route.ts`

- [ ] **Step 1: Générer et stocker `accept_token_hash` à l'insert**

Dans `submit/route.ts`, importer `newToken, hashToken` (déjà `newToken, hashToken, siteBase` importés de `@/lib/car-quote`). Juste avant l'insert `car_requests`, créer le token client et l'inclure dans la row insérée :

```ts
  const clientToken = newToken();
  const { data: inserted, error } = await supabase.from("car_requests")
    .insert({ ...row, ip_hash: ipHash, accept_token_hash: hashToken(clientToken) })
    .select("id").single();
```

(Note : `ip_hash` provient du rate-limit déjà déployé. `row` reste inchangé.)

- [ ] **Step 2: tsc**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: 0 erreur.

- [ ] **Step 3: Commit**

```bash
git add "src/app/api/car-rental/submit/route.ts"
git -c user.name=kerjeanfrancois29 -c user.email=kerjeanfrancois29@gmail.com commit -m "feat(car): token client genere a la creation de la demande"
```

## Task 5 — `quote` : retirer le first-come, écrire sur l'invite, notifier le client

**Files:**
- Modify: `src/app/api/car-rental/quote/route.ts`

- [ ] **Step 1: Remplacer la logique de verrou (L36-76) par l'écriture sur l'invite**

Remplacer, dans `quote/route.ts`, tout le bloc depuis `if (req.status !== "sent")` jusqu'au `return NextResponse.json({ ok: true });` final par :

```ts
  const { canPartnerQuote } = await import("@/lib/car-quotes");
  if (!canPartnerQuote(req.status)) return NextResponse.json({ ok: true, already: true });

  const partner = await partnerById(invite.partner_id);
  if (!partner) return NextResponse.json({ error: "Partner not found" }, { status: 404 });

  // Écrit le devis sur l'invite de CE loueur (pas de course, pas de gagnant unique).
  const { error: upErr } = await supabase.from("car_quote_invites").update({
    status: "quoted", quote_price: price, quote_currency: "EUR",
    quote_car_model: carModel, quote_inclusions: inclusions,
    quoted_at: new Date().toISOString(),
  }).eq("request_id", req.id).eq("partner_id", invite.partner_id);
  if (upErr) return NextResponse.json({ error: "Could not save quote" }, { status: 500 });

  // 1er devis reçu -> la demande passe 'quoted' (pour l'admin + les relances).
  if (req.status === "sent") {
    await supabase.from("car_requests").update({ status: "quoted" }).eq("id", req.id).eq("status", "sent");
  }

  // Notifie le client : nouvelle offre disponible sur sa page (token client sur la demande).
  const { data: reqTok } = await supabase.from("car_requests")
    .select("accept_token_hash").eq("id", req.id).maybeSingle();
  const locale = req.locale || "en";
  const ct = CAR_TYPES_DATA.find((c) => c.id === req.car_type);
  const carTypeLabel = carTypeLabelWithExamples(ct, locale, req.car_type);
  const days = Math.max(1, Math.round((new Date(req.date_to).getTime() - new Date(req.date_from).getTime()) / 86400000));

  // On ne connaît que le HASH du token côté demande : on ne peut pas reconstruire
  // l'URL. Le token clair est envoyé au client au 1er devis via une colonne
  // dédiée ? Non : on garde le token clair uniquement le temps de cet envoi.
  // -> Solution : la page offres est atteignable via le token clair envoyé ICI.
  // Le token clair est régénéré et re-stocké (hash) à chaque envoi pour rester
  // opaque en base. Voir Step 2.
  return NextResponse.json({ ok: true });
```

- [ ] **Step 2: Gérer le token clair pour l'email** (le token clair n'est pas récupérable depuis le hash)

Le token client est créé en clair au submit (Task 4) mais seul son hash est stocké. Pour envoyer l'URL au client à chaque devis, **rotationner le token à chaque notification** : générer un nouveau token clair, stocker son hash sur la demande, envoyer l'URL avec le token clair. Remplacer le bloc de notification par :

```ts
  const { newToken, hashToken, siteBase } = await import("@/lib/car-quote");
  const clientToken = newToken();
  await supabase.from("car_requests").update({ accept_token_hash: hashToken(clientToken) }).eq("id", req.id);

  const locale = req.locale || "en";
  const ct = CAR_TYPES_DATA.find((c) => c.id === req.car_type);
  const carTypeLabel = carTypeLabelWithExamples(ct, locale, req.car_type);

  try {
    const { sendCustomerNewOffer } = await import("@/lib/email");
    await sendCustomerNewOffer({
      email: req.customer_email, locale, customerName: req.customer_name,
      offersUrl: `${siteBase()}/${locale}/car-offer/${clientToken}`,
      pickupLabel: carPickupLabel(req.pickup_slug),
    });
  } catch (e) {
    console.error("[car-rental/quote] customer notify error:", e);
    return NextResponse.json({ ok: true, emailFailed: true });
  }
  return NextResponse.json({ ok: true });
```

> **Note de conception (token rotatif) :** le token client change à chaque nouvelle offre ; seul le dernier email contient le lien valide. C'est acceptable (le client clique le dernier « nouvelle offre »). Alternative si on veut un lien stable : ajouter une colonne `client_token` en clair — écartée (secret en clair en base). Garder le token rotatif.

- [ ] **Step 3: Retirer les imports devenus inutiles**

Enlever l'import `newToken` du haut si dupliqué (il est ré-importé en dynamique). Vérifier que `carPickupLabel, carTypeLabelWithExamples` restent importés.

- [ ] **Step 4: tsc**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: 0 erreur (sauf `sendCustomerNewOffer` inconnu → défini Task 6).

- [ ] **Step 5: Commit** (après Task 6 pour tsc vert, ou committer ensemble)

## Task 6 — Email `sendCustomerNewOffer` + template

**Files:**
- Modify: `src/lib/email.ts`

- [ ] **Step 1: Ajouter `sendCustomerNewOffer`**

Dans `email.ts`, dupliquer la structure de `sendCustomerQuoteEmail` (L484, HTML `kalimeraShell`) en une nouvelle fonction. Signature exacte :

```ts
export async function sendCustomerNewOffer(opts: {
  email: string; locale: string; customerName: string;
  offersUrl: string; pickupLabel: string;
}): Promise<void> {
  // Réutiliser le shell HTML de sendCustomerQuoteEmail. Copy (4 langues en/fr/de/el) :
  // FR sujet : "Une nouvelle offre pour votre location en Crète"
  // FR corps : "Bonjour {name}, une offre vient d'arriver pour votre location a {pickup}.
  //             D'autres peuvent suivre. Comparez et choisissez ici :" + bouton -> offersUrl.
  // EN sujet : "A new offer for your Crete car rental"
  // DE/EL : traduire dans le meme registre. CTA label : Comparer les offres / Compare offers.
}
```

Respecter : accents FR corrects, zéro em-dash, From/branding identiques à `sendCustomerQuoteEmail`.

- [ ] **Step 2: tsc + commit Task 5+6**

Run: `npx tsc --noEmit -p tsconfig.json` → 0 erreur.
```bash
git add "src/app/api/car-rental/quote/route.ts" src/lib/email.ts
git -c user.name=kerjeanfrancois29 -c user.email=kerjeanfrancois29@gmail.com commit -m "feat(car): quote sans first-come, ecrit sur l'invite, notifie le client (multi-offres)"
```

## Task 7 — Page offres : lister toutes les offres, choisir

**Files:**
- Modify: `src/app/[locale]/car-offer/[token]/page.tsx`
- Modify: `src/app/[locale]/car-offer/[token]/AcceptButton.tsx`

- [ ] **Step 1: Page — charger toutes les offres via `requestByClientToken`**

Dans `page.tsx`, remplacer la lecture single-offre par :
```ts
import { requestByClientToken } from "@/lib/car-quotes-db";
import { sortQuotesByPrice } from "@/lib/car-quotes";
// ...
const found = await requestByClientToken(token);
if (!found) notFound();
const { request, quotes } = found;
const offers = sortQuotesByPrice(quotes);
```
États : `request.status === "accepted"` → afficher le choix (badge « réservé »). `offers.length === 0` → « Vos offres arrivent, revenez bientôt ». Sinon rendre **une carte par offre** (boucle sur `offers`), réutilisant le markup de carte existant (loueur=`o.partner_name`, prix=`o.quote_price`, modèle=`o.quote_car_model`, inclusions via `inclusionLabels`, réassurance via `sharedOfferCopy`), + `<AcceptButton token={token} inviteId={o.id} .../>` par carte. Garder le check `isOfferExpired(o.quoted_at, request.date_from, Date.now())`.

- [ ] **Step 2: AcceptButton — passer `inviteId`**

Ajouter la prop `inviteId: number` et l'inclure dans le POST :
```ts
await fetch("/api/car-rental/accept", { method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ token, invite_id: inviteId }) });
```

- [ ] **Step 3: tsc**

Run: `npx tsc --noEmit -p tsconfig.json` → 0 erreur (sauf accept route pas encore adaptée → Task 8).

- [ ] **Step 4: Commit** (avec Task 8 pour tsc vert).

## Task 8 — `accept` : choisir une invite, snapshot, chosen/not_chosen, email loser

**Files:**
- Modify: `src/app/api/car-rental/accept/route.ts`
- Modify: `src/lib/email.ts` (`sendPartnerNotChosen`)

- [ ] **Step 1: Réécrire accept pour choisir une invite précise**

Remplacer le corps de `accept/route.ts` (après parsing) par :
```ts
  const token = typeof body.token === "string" ? body.token : "";
  const inviteId = typeof body.invite_id === "number" ? body.invite_id : Number(body.invite_id);
  if (!token || !Number.isFinite(inviteId)) return NextResponse.json({ error: "Missing token/invite" }, { status: 400 });

  const { requestByClientToken } = await import("@/lib/car-quotes-db");
  const { findChosenInvite } = await import("@/lib/car-quotes");
  const found = await requestByClientToken(token);
  if (!found) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { request: row, quotes } = found;
  if (row.status === "accepted") return NextResponse.json({ ok: true, already: true });

  const chosen = findChosenInvite(quotes, inviteId);
  if (!chosen) return NextResponse.json({ error: "No quote for this invite" }, { status: 409 });
  if (isOfferExpired(chosen.quoted_at, row.date_from as string, Date.now())) {
    return NextResponse.json({ ok: false, expired: true }, { status: 410 });
  }

  const partner = await partnerById(chosen.partner_id);
  // Snapshot du devis choisi sur car_requests (retro-compat admin/commissions).
  await supabase.from("car_requests").update({
    status: "accepted", accepted_at: new Date().toISOString(), accept_token_hash: null,
    quoted_price: chosen.quote_price, quoted_currency: chosen.quote_currency ?? "EUR",
    quoted_car_model: chosen.quote_car_model ?? null, quoted_inclusions: chosen.quote_inclusions ?? [],
    quoted_at: chosen.quoted_at, quoted_by_partner_id: chosen.partner_id,
    partner_name: partner?.name ?? chosen.partner_name, partner_email: partner?.email ?? null,
  }).eq("id", row.id);
  // Statuts invites : gagnant chosen, autres chiffrés not_chosen.
  await supabase.from("car_quote_invites").update({ status: "chosen" }).eq("id", inviteId);
  await supabase.from("car_quote_invites").update({ status: "not_chosen" })
    .eq("request_id", row.id).eq("status", "quoted").neq("id", inviteId);
```
Puis garder l'envoi `sendConnectionEmails` existant (adapter les champs source : `row.pickup_slug`, `chosen.quote_price`, `partner`), et **après**, notifier les losers :
```ts
  try {
    const losers = quotes.filter((q) => q.id !== inviteId && q.quote_price != null);
    if (losers.length) {
      const { sendPartnerNotChosen } = await import("@/lib/email");
      for (const l of losers) {
        const p = await partnerById(l.partner_id);
        if (p?.email) await sendPartnerNotChosen(p.email, p.name);
      }
    }
  } catch (e) { console.error("[car-rental/accept] loser notify error:", e); }
```

- [ ] **Step 2: `sendPartnerNotChosen` dans email.ts**

```ts
export async function sendPartnerNotChosen(email: string, partnerName: string): Promise<void> {
  // Email court EN (les loueurs sont pros, EN suffit — cf sendAgencyQuoteRequest).
  // Sujet : "Car Rental Direct - not selected this time"
  // Corps : "Hi {partnerName}, the customer chose another offer this time. Thanks
  //          for your quote - more requests will come. No action needed."
}
```

- [ ] **Step 3: tsc + check-car-quotes + commit Task 7+8**

Run: `npx tsc --noEmit -p tsconfig.json` → 0 erreur ; `node --experimental-strip-types scripts/check-car-quotes.mjs` → All passed.
```bash
git add "src/app/api/car-rental/accept/route.ts" "src/app/[locale]/car-offer/[token]/page.tsx" "src/app/[locale]/car-offer/[token]/AcceptButton.tsx" src/lib/email.ts
git -c user.name=kerjeanfrancois29 -c user.email=kerjeanfrancois29@gmail.com commit -m "feat(car): page multi-offres + choix d'une invite + email losers"
```

## Task 9 — Admin : devis par demande + choix surligné

**Files:**
- Modify: `src/lib/car-admin.ts`
- Modify: `src/app/admin/car-rental/page.tsx`
- Modify: `src/app/admin/car-rental/requests-table.tsx`

- [ ] **Step 1: Type `AdminQuote` dans car-admin.ts**

Ajouter (près de `AdminRequest`) :
```ts
export interface AdminQuote { partner_id: number; partner_name: string; status: string; quote_price: number | null; }
```
`partnerStats.won` : remplacer le comptage `r.quoted_by_partner_id === partnerId` par le comptage des invites `status === "chosen"` du loueur (passé en argument). Signature ajustée : ajouter un param `chosenByPartner: Map<number, number>` et faire `st.won = chosenByPartner.get(partnerId) ?? 0`. (Le snapshot `quoted_by_partner_id` reste équivalent ; garder le calcul existant est acceptable si plus simple — au choix de l'implémenteur, documenter.)

- [ ] **Step 2: page.tsx — charger les invites par demande**

Dans la page admin (server), après avoir chargé les requests, charger toutes les `car_quote_invites` (avec nom loueur) et les grouper par `request_id` en `Map<number, AdminQuote[]>`. Passer la map à `requests-table`.

- [ ] **Step 3: requests-table.tsx — afficher les devis**

Pour chaque demande, sous la ligne principale, rendre la liste des devis : `partner_name — {price} €` + badge **« choisi par le client »** si `status === "chosen"`, badge « ne peut pas » si `status === "declined"` (P2). Demande sans devis = inchangé.

- [ ] **Step 4: tsc + check-car-admin + commit**

Run: `npx tsc --noEmit -p tsconfig.json` → 0 ; `npm run check:car-admin` → OK.
```bash
git add src/lib/car-admin.ts "src/app/admin/car-rental/page.tsx" "src/app/admin/car-rental/requests-table.tsx"
git -c user.name=kerjeanfrancois29 -c user.email=kerjeanfrancois29@gmail.com commit -m "feat(car-admin): devis par demande + choix client surligne"
```

## Task 10 — Déploiement Phase 1 + e2e contrôlé

- [ ] **Step 1: Build local**

Run: `npx tsc --noEmit -p tsconfig.json` puis (si dispo, via wrapper avec `SUPABASE_SERVICE_KEY`) `npm run build`.
Expected: EXIT 0.

- [ ] **Step 2: Déployer**

```bash
git fetch origin master -q
git merge-base --is-ancestor origin/master HEAD && echo "ff OK"
git push origin feat/car-multi-quote:master
git push origin feat/car-multi-quote:main
```

- [ ] **Step 3: e2e contrôlé (loueurs TEST uniquement)**

Créer 2 loueurs `active=true` dans une **zone de test** (pas une vraie zone servie), poster une demande de test via `POST /api/car-rental/submit`, faire 2 devis via les 2 tokens `/api/car-rental/quote`, vérifier `/car-offer/<token>` liste 2 offres triées par prix, choisir la moins chère via `/api/car-rental/accept`, vérifier `status=accepted` + `chosen`/`not_chosen` + admin affiche les 2 devis + surlignage. **Nettoyer** (supprimer request + invites + loueurs test). **NE JAMAIS** utiliser une vraie zone (spam loueurs réels).

- [ ] **Step 4: Log mémoire** (session_log.md + fiche project_crete_direct + index MEMORY.md).

---

# PHASE 2 — Relances auto + désistements 2 côtés

## Task 11 — Désistement loueur (`?decline=1`)

**Files:**
- Modify: `src/app/api/car-rental/quote/route.ts`
- Modify: `src/app/[locale]/car-quote/[token]/QuoteForm.tsx`

- [ ] **Step 1: Route — brancher `?decline=1`**

Au début du POST `quote/route.ts`, après résolution de l'invite/demande, si `new URL(request.url).searchParams.get("decline") === "1"` : passer l'invite `status="declined"`, `declined_at=now()` (seulement si `canPartnerQuote(req.status)`), retourner `{ ok: true, declined: true }`. Ne pas exiger de prix dans ce cas.

- [ ] **Step 2: QuoteForm — bouton « Je ne peux pas répondre à cette demande »**

Sous le formulaire de prix, ajouter un bouton secondaire qui POST `/api/car-rental/quote?decline=1` avec `{ token }`. Au succès, afficher « Noté, merci ». Copy i18n en/fr/de/el.

- [ ] **Step 3: tsc + commit**

```bash
git add "src/app/api/car-rental/quote/route.ts" "src/app/[locale]/car-quote/[token]/QuoteForm.tsx"
git -c user.name=kerjeanfrancois29 -c user.email=kerjeanfrancois29@gmail.com commit -m "feat(car): desistement loueur (je ne peux pas repondre)"
```

## Task 12 — Désistement client (`?decline=1`)

**Files:**
- Modify: `src/app/api/car-rental/accept/route.ts`
- Modify: `src/app/[locale]/car-offer/[token]/page.tsx` (+ un petit client component `DeclineButton.tsx`)

- [ ] **Step 1: Route — brancher `?decline=1`**

Dans `accept/route.ts`, si `?decline=1` : résoudre la demande via token, si non `accepted`/`declined_by_client`, passer `car_requests.status="declined_by_client"`, `accept_token_hash=null`, invites `quoted`→`not_chosen`. Retourner `{ ok: true, declined: true }`. **Pas** d'email loser.

- [ ] **Step 2: Bouton « Aucune de ces offres ne me convient »**

Créer `DeclineButton.tsx` (client) qui POST `/api/car-rental/accept?decline=1` avec `{ token }`. L'afficher sous la liste d'offres (si `offers.length > 0` et non accepté). Copy i18n. Au succès : « Noté, pas de souci ».

- [ ] **Step 3: tsc + commit**

```bash
git add "src/app/api/car-rental/accept/route.ts" "src/app/[locale]/car-offer/[token]/page.tsx" "src/app/[locale]/car-offer/[token]/DeclineButton.tsx"
git -c user.name=kerjeanfrancois29 -c user.email=kerjeanfrancois29@gmail.com commit -m "feat(car): decline client (aucune offre ne convient)"
```

## Task 13 — Cron relances + emails

**Files:**
- Create: `src/app/api/cron/car-relance/route.ts`
- Modify: `src/lib/email.ts` (`sendPartnerRelance`, `sendCustomerRelance`)
- Modify: `vercel.json`

- [ ] **Step 1: Emails relance dans email.ts**

`sendPartnerRelance(email, partnerName, quoteUrl)` : EN, « A customer is still waiting for your quote — quote or tell us you can't: {quoteUrl} ». `sendCustomerRelance(opts: { email, locale, customerName, offersUrl })` : 4 langues, « Vos offres vous attendent, choisissez ou dites qu'aucune ne convient : {offersUrl} ». Mirotent le shell existant.

- [ ] **Step 2: Route cron** (auth `CRON_SECRET`, pattern `/api/cron/car-no-quote`)

```ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { partnerNeedsRelance, clientNeedsRelance } from "@/lib/car-quotes";
import { newToken, hashToken, siteBase } from "@/lib/car-quote";

export async function GET(request: NextRequest) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const now = Date.now();
  // Passe loueur : invites 'invited' des demandes ouvertes, >24h, non relancées.
  // Passe client : demandes 'quoted' non tranchées, <2 relances, dernière >24h.
  // Pour chaque cible éligible (via partnerNeedsRelance / clientNeedsRelance) :
  //  - loueur : régénérer le token loueur ? Non — réutiliser le quote_token existant de l'invite.
  //             envoyer sendPartnerRelance(partner.email, partner.name, `${siteBase()}/en/car-quote/<token clair>`)
  //             MAIS le token clair loueur n'est pas stocké -> émettre un NOUVEAU quote_token_hash
  //             sur l'invite et envoyer le clair. Puis invite.relanced_at = now.
  //  - client : rotationner accept_token (comme Task 5), sendCustomerRelance, client_relanced_at=now, count+1.
  return NextResponse.json({ ok: true });
}
```
> Détail token loueur : comme le token client, le token loueur clair n'est pas récupérable ; à la relance, générer un nouveau `quote_token` (clair) pour l'invite, stocker son hash, envoyer le clair dans l'email. L'implémenteur écrit les deux boucles avec les gardes `partnerNeedsRelance`/`clientNeedsRelance` (déjà testées Task 2), lit `created_at` de l'invite et de la demande pour les fenêtres 24h.

- [ ] **Step 3: vercel.json — cron quotidien**

Ajouter dans `crons` :
```json
{ "path": "/api/cron/car-relance", "schedule": "0 9 * * *" }
```

- [ ] **Step 4: tsc + commit + déploiement Phase 2**

Run: `npx tsc --noEmit -p tsconfig.json` → 0 ; `node --experimental-strip-types scripts/check-car-quotes.mjs` → All passed.
```bash
git add "src/app/api/cron/car-relance/route.ts" src/lib/email.ts vercel.json
git -c user.name=kerjeanfrancois29 -c user.email=kerjeanfrancois29@gmail.com commit -m "feat(car): cron relances loueur+client (car-relance)"
git push origin feat/car-multi-quote:master && git push origin feat/car-multi-quote:main
```

- [ ] **Step 5: e2e Phase 2 (test)** : loueur test invité non-chiffré → forcer `created_at` >24h → GET cron avec `Authorization: Bearer $CRON_SECRET` → vérifier relance envoyée + `relanced_at` posé + non-re-relance. Idem client. Tester les 2 boutons de désistement (loueur/client) coupent les relances. Nettoyer.

- [ ] **Step 6: Log mémoire.**

---

## Self-Review (rempli par l'auteur du plan)

**Couverture spec :** §1 data model→T1 ; §2 loueur quote→T5, désistement→T11 ; §3 notif client→T5/T6 ; §4 page offres→T7 ; §5 choix→T8, décline client→T12 ; §6 admin→T9 ; §7 relances→T13. Tous couverts.

**Placeholders :** les tâches UI/email référencent une fonction existante EXACTE à mirrorer (`sendCustomerQuoteEmail`, markup carte offre) avec le delta précis — pas de « add error handling » vague. Le token rotatif (loueur+client) est explicité (pas récupérable depuis le hash).

**Cohérence types :** `QuoteInvite` (T2) réutilisé par `car-quotes-db.ts` (T3), la page (T7), accept (T8). `InviteStatus` : `invited/quoted/declined/chosen/not_chosen` cohérent partout. `partnerNeedsRelance`/`clientNeedsRelance` signatures identiques T2→T13.

**Risque connu :** `quote_inclusions` en `jsonb` (T1) vs `text[]` du modèle actuel `quoted_inclusions` — vérifier à l'implémentation que la lecture/écriture d'inclusions reste un tableau de clés (T2 `string[]`). Aligner si besoin.
