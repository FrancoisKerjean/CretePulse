# Car Rental Direct — Devis UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corriger 4 trous du funnel devis Car Rental Direct : label « gagnant » prématuré, offre client pauvre en info, silence si aucun loueur ne répond, offre sans expiration.

**Architecture:** Next.js App Router + Supabase (via `supabaseAdmin`). Le flow existant (wizard → `sent` → fan-out loueurs → premier devis `quoted` → email client → `/car-offer` → `accepted`) est conservé. On enrichit les données du devis (modèle + inclusions), les surfaces client (email + page), on ajoute un accusé au submit + un cron de relance silence, et une expiration calculée.

**Tech Stack:** TypeScript, Next.js (App Router, force-dynamic), Supabase JS, Resend (emails via `kalimeraShell`), Vercel Cron.

**Validation convention (repo) :** pas de runner de tests unitaires (cf. `CLAUDE.md` : « Vert avant push : tsc + next build »). Chaque tâche valide par `npx tsc --noEmit` et, si une page prerendue est touchée, `npx next build` **sans clé service** (reproduit le scope Preview, permis par le fix build-safe `3721b33`). Vérif fonctionnelle via preview Vercel + aperçu HTML des emails.

**i18n :** surfaces client en 4 langues (EN/FR/DE/EL) — obligatoire (`CLAUDE.md`). La page loueur `/car-quote` reste en EN (pattern existant, loueurs locaux). Ce plan donne EN+FR complets ; **DE+EL doivent être complétés sur le même modèle que les blocs `COPY`/`QUOTE_COPY` existants** avant merge.

---

## Task 1 : Migration data (colonnes devis + idempotence cron)

**Files:**
- Create: `supabase/migrations/20260705_car_quote_ux.sql`

- [ ] **Step 1: Écrire la migration** (pattern identique à `20260705_car_admin.sql`)

```sql
-- Devis enrichi (trou 2) + idempotence du cron de silence (trou 3).
--   quoted_car_model     : modèle proposé par le loueur (optionnel, ex "VW Polo 2023")
--   quoted_inclusions    : clés d'inclusions cochées par le loueur (jsonb array de string)
--   no_quote_notified_at : horodatage de l'email "aucune agence n'a répondu" (une seule fois)
alter table public.car_requests
  add column if not exists quoted_car_model     text,
  add column if not exists quoted_inclusions    jsonb,
  add column if not exists no_quote_notified_at timestamptz;

notify pgrst, 'reload schema';
```

- [ ] **Step 2: Appliquer la migration** sur la base (via l'outil de migration habituel du repo ou `psql`). Vérifier que les 3 colonnes existent :

Run (adapter au client SQL du repo) :
```sql
select column_name from information_schema.columns
where table_name='car_requests'
  and column_name in ('quoted_car_model','quoted_inclusions','no_quote_notified_at');
```
Expected: 3 lignes.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260705_car_quote_ux.sql
git commit -m "feat(car-quote): migration colonnes devis (model, inclusions, no_quote_notified_at)"
```

---

## Task 2 : Label « gagnant » conditionné au statut (trou 1)

**Files:**
- Modify: `src/app/admin/car-rental/requests-table.tsx:138`

- [ ] **Step 1: Vérifier que `status` et `accepted_at` sont disponibles** dans le type des rows admin. Ouvrir `src/lib/car-admin.ts` : le type de requête doit exposer `status` (déjà utilisé L119 `statusBadge(r.status)`) et `accepted_at`. Si `accepted_at` n'est pas sélectionné/typé, l'ajouter au select admin (chercher le `.select(...)` de `car_requests` côté admin et y ajouter `accepted_at`). Le libellé ci-dessous n'utilise que `r.status`, donc `accepted_at` est optionnel.

- [ ] **Step 2: Remplacer le libellé du gagnant** (L138)

Remplacer :
```tsx
{winner ? <>Gagnant : <span className="font-bold">{winner.name}</span></> : <span className="text-text-muted">Pas encore de devis</span>}
```
Par :
```tsx
{winner ? (
  r.status === "accepted"
    ? <>Choisi par le client : <span className="font-bold">{winner.name}</span></>
    : <>Devis reçu de <span className="font-bold">{winner.name}</span> <span className="text-text-muted">· en attente du client</span></>
) : <span className="text-text-muted">Pas encore de devis</span>}
```

- [ ] **Step 3: Valider**

Run: `npx tsc --noEmit`
Expected: 0 erreur.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/car-rental/requests-table.tsx
git commit -m "fix(car-admin): label gagnant conditionne au statut (quoted vs accepted)"
```

---

## Task 3 : Module partagé des inclusions (clés + libellés i18n)

**Files:**
- Create: `src/lib/car-inclusions.ts`

- [ ] **Step 1: Créer le module** (source unique des clés + libellés, réutilisé par le form loueur, l'email et la page client)

```ts
// Inclusions optionnelles d'un devis loueur. Stockées en base comme clés
// canoniques (jsonb array) ; libellés traduits à l'affichage.
export const CAR_INCLUSION_KEYS = [
  "basic_insurance", "unlimited_km", "second_driver",
  "free_cancellation", "child_seat", "airport_pickup",
] as const;

export type CarInclusionKey = (typeof CAR_INCLUSION_KEYS)[number];

export function isInclusionKey(v: unknown): v is CarInclusionKey {
  return typeof v === "string" && (CAR_INCLUSION_KEYS as readonly string[]).includes(v);
}

// Libellés client (4 langues). EN/FR fournis ; DE/EL à compléter sur ce modèle.
export const CAR_INCLUSION_LABELS: Record<string, Record<CarInclusionKey, string>> = {
  en: { basic_insurance: "Basic insurance included", unlimited_km: "Unlimited mileage", second_driver: "Second driver included", free_cancellation: "Free cancellation", child_seat: "Child seat available", airport_pickup: "Airport pickup" },
  fr: { basic_insurance: "Assurance de base incluse", unlimited_km: "Kilométrage illimité", second_driver: "2ᵉ conducteur inclus", free_cancellation: "Annulation gratuite", child_seat: "Siège enfant disponible", airport_pickup: "Prise en charge à l'aéroport" },
  de: { basic_insurance: "Grundversicherung inklusive", unlimited_km: "Unbegrenzte Kilometer", second_driver: "Zweiter Fahrer inklusive", free_cancellation: "Kostenlose Stornierung", child_seat: "Kindersitz verfügbar", airport_pickup: "Abholung am Flughafen" },
  el: { basic_insurance: "Βασική ασφάλιση", unlimited_km: "Απεριόριστα χιλιόμετρα", second_driver: "Δεύτερος οδηγός", free_cancellation: "Δωρεάν ακύρωση", child_seat: "Παιδικό κάθισμα", airport_pickup: "Παραλαβή από αεροδρόμιο" },
};

// Libellés côté loueur (EN, pattern QuoteForm hardcodé EN).
export const CAR_INCLUSION_LABELS_PARTNER: Record<CarInclusionKey, string> = {
  basic_insurance: "Basic insurance", unlimited_km: "Unlimited mileage", second_driver: "Second driver",
  free_cancellation: "Free cancellation", child_seat: "Child seat", airport_pickup: "Airport pickup",
};

export function inclusionLabels(keys: string[] | null | undefined, locale: string): string[] {
  const table = CAR_INCLUSION_LABELS[locale] ?? CAR_INCLUSION_LABELS.en;
  return (keys ?? []).filter(isInclusionKey).map((k) => table[k]);
}
```

- [ ] **Step 2: Valider** — `npx tsc --noEmit` → 0 erreur.

- [ ] **Step 3: Commit**

```bash
git add src/lib/car-inclusions.ts
git commit -m "feat(car-quote): module partage des inclusions (cles + libelles i18n)"
```

---

## Task 4 : Formulaire loueur — modèle + inclusions (trou B)

**Files:**
- Modify: `src/app/[locale]/car-quote/[token]/QuoteForm.tsx`
- Modify: `src/app/api/car-rental/quote/route.ts`

- [ ] **Step 1: Ajouter les champs au formulaire** (`QuoteForm.tsx`)

Dans le composant, ajouter deux états après `const [price, setPrice] = useState("")` :
```tsx
const [carModel, setCarModel] = useState("");
const [inclusions, setInclusions] = useState<string[]>([]);
```
Importer en tête : `import { CAR_INCLUSION_KEYS, CAR_INCLUSION_LABELS_PARTNER } from "@/lib/car-inclusions";`

Dans le `body` du `fetch` (actuellement `JSON.stringify({ token, price: value })`), passer :
```tsx
body: JSON.stringify({ token, price: value, carModel: carModel.trim() || null, inclusions }),
```

Dans le `<form>`, **après** le bloc prix (avant le `<button>`), insérer :
```tsx
<label style={{ fontSize: 14, fontWeight: 600, color: "#0B3954" }}>Car model offered (optional)</label>
<input
  type="text" value={carModel} onChange={(e) => setCarModel(e.target.value)}
  placeholder="e.g. VW Polo 2023"
  style={{ padding: "12px 14px", fontSize: 16, borderRadius: 10, border: "1px solid #DCE9EE", outline: "none" }}
/>
<span style={{ fontSize: 14, fontWeight: 600, color: "#0B3954" }}>Included in the price (optional)</span>
<div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
  {CAR_INCLUSION_KEYS.map((k) => {
    const on = inclusions.includes(k);
    return (
      <button key={k} type="button"
        onClick={() => setInclusions((cur) => on ? cur.filter((x) => x !== k) : [...cur, k])}
        style={{ padding: "8px 12px", borderRadius: 999, fontSize: 13, cursor: "pointer",
          border: on ? "1px solid #008C9E" : "1px solid #DCE9EE",
          background: on ? "#008C9E" : "#fff", color: on ? "#fff" : "#0B3954" }}>
        {CAR_INCLUSION_LABELS_PARTNER[k]}
      </button>
    );
  })}
</div>
```

- [ ] **Step 2: Recevoir et persister côté API** (`quote/route.ts`)

Après la lecture de `price` (L16), ajouter le parsing :
```ts
import { isInclusionKey } from "@/lib/car-inclusions";
// ...
const carModel = typeof body.carModel === "string" && body.carModel.trim() ? body.carModel.trim().slice(0, 120) : null;
const inclusions = Array.isArray(body.inclusions) ? body.inclusions.filter(isInclusionKey) : [];
```
Dans l'`update` du verrou first-come (L40-44), ajouter aux colonnes écrites :
```ts
quoted_car_model: carModel, quoted_inclusions: inclusions,
```

- [ ] **Step 3: Valider** — `npx tsc --noEmit` → 0 erreur. `npx next build` sans clé → 10635/10635 (la page `/car-quote` est prerendue).

- [ ] **Step 4: Commit**

```bash
git add "src/app/[locale]/car-quote/[token]/QuoteForm.tsx" src/app/api/car-rental/quote/route.ts
git commit -m "feat(car-quote): formulaire loueur - modele + inclusions optionnels"
```

---

## Task 5 : Email devis enrichi (trou 2, côté email)

**Files:**
- Modify: `src/lib/email.ts` (`CarQuoteInfo` L445-448, `QUOTE_COPY` L460-465, `sendCustomerQuoteEmail` L468-495)
- Modify: `src/app/api/car-rental/quote/route.ts` (appel `sendCustomerQuoteEmail`)

- [ ] **Step 1: Étendre l'interface `CarQuoteInfo`** (L445)

```ts
export interface CarQuoteInfo {
  pickupLabel: string; dateFrom: string; dateTo: string; carTypeLabel: string;
  price: number; currency: string;
  partnerName: string;            // identité loueur
  carModel?: string | null;       // modèle proposé
  inclusions?: string[];          // clés d'inclusions
  days: number;                   // nb de jours (pour le /jour)
}
```

- [ ] **Step 2: Ajouter les copies i18n** (bloc réassurance + étapes). Étendre chaque entrée de `QUOTE_COPY` avec (EN/FR fournis, DE/EL à compléter) :

```ts
// à ajouter dans chaque langue de QUOTE_COPY :
en: { /* ...existant... */,
  offerFrom: "Offer from", localAgency: "local rental agency in Crete",
  included: "Included in the price", perDay: "per day", total: "total",
  reassure: ["No online prepayment — no card needed to book", "You pay the agency on pickup — cash accepted", "A real local agency in Crete, direct contact"],
  steps: ["You accept this offer", "We share your details with the agency", "The agency contacts you to finalise — payment on pickup"] },
fr: { /* ...existant... */,
  offerFrom: "Offre de", localAgency: "agence de location locale en Crète",
  included: "Inclus dans le prix", perDay: "par jour", total: "au total",
  reassure: ["Aucun prépaiement en ligne — pas de carte pour réserver", "Vous payez l'agence au retrait — espèces acceptées", "Une vraie agence locale en Crète, en direct"],
  steps: ["Vous acceptez cette offre", "On transmet vos coordonnées à l'agence", "L'agence vous contacte pour finaliser — paiement au retrait"] },
```
Mettre à jour le type inline de `QUOTE_COPY` en conséquence (`intro/details/cta/foot` + `offerFrom/localAgency/included/perDay/total/reassure:string[]/steps:string[]`).

- [ ] **Step 3: Enrichir le HTML `inner`** de `sendCustomerQuoteEmail` (L474-485). Remplacer le bloc détails par une version qui ajoute loueur, modèle, prix total+/jour, inclusions, réassurance, étapes. Réutiliser les couleurs `C.*` et `pillButton` existants :

```ts
const perDay = q.days > 0 ? Math.round(q.price / q.days) : q.price;
const incl = inclusionLabels(q.inclusions, l); // import { inclusionLabels } from "@/lib/car-inclusions"
const inner = `
  <p style="margin:0 0 6px; color:${C.text}; font-size:18px; font-weight:800;">${opts.customerName ? `${opts.customerName}, ` : ""}${money(q.price, q.currency)} <span style="font-weight:600; font-size:14px; color:${C.muted};">${c.total} · ~${money(perDay, q.currency)} ${c.perDay}</span></p>
  <p style="margin:0 0 6px; color:${C.text}; font-size:14px;">${c.offerFrom} <strong>${q.partnerName}</strong> · ${c.localAgency}</p>
  <p style="margin:0 0 18px; color:${C.muted}; font-size:14px; line-height:1.6;">${c.intro}</p>
  <div style="background:${C.surface}; border:1px solid ${C.border}; border-radius:14px; padding:14px 16px; margin:0 0 16px;">
    <p style="margin:0 0 6px; color:${C.faint}; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:.05em;">${c.details}</p>
    <p style="margin:0; color:${C.text}; font-size:14px; line-height:1.7;">
      ${q.pickupLabel}<br>${q.dateFrom} → ${q.dateTo}<br>${q.carTypeLabel}${q.carModel ? `<br><strong>${q.carModel}</strong>` : ""}
    </p>
  </div>
  ${incl.length ? `<div style="margin:0 0 16px;"><p style="margin:0 0 6px; color:${C.faint}; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:.05em;">${c.included}</p><p style="margin:0; color:${C.text}; font-size:14px; line-height:1.7;">${incl.map((x) => `✓ ${x}`).join("<br>")}</p></div>` : ""}
  <div style="background:${C.surface}; border:1px solid ${C.border}; border-radius:14px; padding:12px 16px; margin:0 0 18px;">
    ${c.reassure.map((r) => `<p style="margin:0 0 4px; color:${C.text}; font-size:13px;">• ${r}</p>`).join("")}
  </div>
  <div style="text-align:center; margin:0 0 14px;">${pillButton(opts.acceptUrl, c.cta, C.lagoonDeep)}</div>
  <p style="margin:0 0 4px; color:${C.faint}; font-size:12px; font-weight:700;">${c.details}:</p>
  <p style="margin:0 0 14px; color:${C.muted}; font-size:12px; line-height:1.7;">${c.steps.map((s, i) => `${i + 1}. ${s}`).join("<br>")}</p>
  <p style="margin:0; color:${C.faint}; font-size:12px; line-height:1.6;">${c.foot}</p>
`;
```
Ajouter en tête de fichier l'import : `import { inclusionLabels } from "@/lib/car-inclusions";`

- [ ] **Step 4: Passer les nouveaux champs à l'appel** (`quote/route.ts`, L56-65). Calculer `days` et passer `partnerName`, `carModel`, `inclusions`, `days` :

```ts
const days = Math.max(1, Math.round((new Date(req.date_to).getTime() - new Date(req.date_from).getTime()) / 86400000));
// dans quote: { ... existant ..., partnerName: partner.name, carModel, inclusions, days }
```

- [ ] **Step 5: Valider** — `npx tsc --noEmit` → 0 erreur. Générer un aperçu HTML de l'email (appeler `kalimeraShell(inner)` avec des valeurs de test dans un petit script ou route de dev) et l'ouvrir à l'écran pour relecture visuelle.

- [ ] **Step 6: Commit**

```bash
git add src/lib/email.ts src/app/api/car-rental/quote/route.ts
git commit -m "feat(car-quote): email devis enrichi (loueur, modele, inclusions, prix/jour, reassurance, etapes)"
```

---

## Task 6 : Page `/car-offer` enrichie (trou 2, côté page)

**Files:**
- Modify: `src/app/[locale]/car-offer/[token]/page.tsx`

- [ ] **Step 1: Étendre le SELECT** (L30-33) pour récupérer les nouveaux champs :

```ts
.select("id, status, pickup_slug, date_from, date_to, car_type, quoted_price, quoted_currency, quoted_at, partner_name, quoted_car_model, quoted_inclusions")
```

- [ ] **Step 2: Étendre le type `Copy` et le `COPY`** (L17-23) avec les mêmes clés que l'email (EN/FR fournis, DE/EL à compléter sur le modèle des entrées existantes) :

```ts
type Copy = { title: string; intro: string; request: string; accept: string; done: string; expired: string; alreadyTitle: string; alreadyBody: string;
  offerFrom: string; localAgency: string; included: string; perDay: string; total: string; reassure: string[]; steps: string[] };
// en: { ...existant..., offerFrom: "Offer from", localAgency: "local rental agency in Crete", included: "Included in the price", perDay: "per day", total: "total", reassure: [ "No online prepayment — no card needed to book", "You pay the agency on pickup — cash accepted", "A real local agency in Crete, direct contact" ], steps: [ "You accept this offer", "We share your details with the agency", "The agency contacts you to finalise — payment on pickup" ] },
// fr: { ...existant..., offerFrom: "Offre de", localAgency: "agence de location locale en Crète", included: "Inclus dans le prix", perDay: "par jour", total: "au total", reassure: [ "Aucun prépaiement en ligne — pas de carte pour réserver", "Vous payez l'agence au retrait — espèces acceptées", "Une vraie agence locale en Crète, en direct" ], steps: [ "Vous acceptez cette offre", "On transmet vos coordonnées à l'agence", "L'agence vous contacte pour finaliser — paiement au retrait" ] },
```

- [ ] **Step 3: Enrichir le rendu** (bloc `else` non-accepté, L60-73). Ajouter sous le prix : ligne loueur, prix total+/jour, modèle, inclusions, réassurance, étapes. Importer `inclusionLabels` :

```tsx
import { inclusionLabels } from "@/lib/car-inclusions";
// dans le composant, avant le return :
const incl = inclusionLabels(row.quoted_inclusions as string[] | null, locale);
const days = Math.max(1, Math.round((new Date(row.date_to).getTime() - new Date(row.date_from).getTime()) / 86400000));
const perDay = money(Math.round(row.quoted_price / days), row.quoted_currency || "EUR");
```
Sous le `<h1>{priceStr}</h1>` (L62), ajouter :
```tsx
<p style={{ margin: "0 0 6px", color: "#5C7886", fontSize: 13 }}>{priceStr} {c.total} · ~{perDay} {c.perDay}</p>
{row.partner_name ? <p style={{ margin: "0 0 12px", color: "#0B3954", fontSize: 14 }}>{c.offerFrom} <strong>{row.partner_name}</strong> · {c.localAgency}</p> : null}
```
Dans la carte « request » (après la ligne carTypeLabel, L69), ajouter le modèle :
```tsx
{row.quoted_car_model ? <div style={{ fontWeight: 700 }}>{row.quoted_car_model}</div> : null}
```
Après la carte « request » (avant `<AcceptButton>`, L71), ajouter inclusions + réassurance + étapes :
```tsx
{incl.length ? (
  <div style={{ marginBottom: 16, fontSize: 14, color: "#0B3954", lineHeight: 1.8 }}>
    <p style={{ margin: "0 0 4px", color: "#94A3B8", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em" }}>{c.included}</p>
    {incl.map((x) => <div key={x}>✓ {x}</div>)}
  </div>
) : null}
<div style={{ background: "#F6FBFC", border: "1px solid #DCE9EE", borderRadius: 14, padding: "12px 16px", marginBottom: 18 }}>
  {c.reassure.map((r) => <p key={r} style={{ margin: "0 0 4px", color: "#0B3954", fontSize: 13 }}>• {r}</p>)}
</div>
<ol style={{ margin: "0 0 18px", paddingLeft: 18, color: "#5C7886", fontSize: 13, lineHeight: 1.7 }}>
  {c.steps.map((s) => <li key={s}>{s}</li>)}
</ol>
```

- [ ] **Step 4: Valider** — `npx tsc --noEmit` → 0 erreur. `npx next build` sans clé → OK (page prerendue force-dynamic, mais build doit rester vert).

- [ ] **Step 5: Commit**

```bash
git add "src/app/[locale]/car-offer/[token]/page.tsx"
git commit -m "feat(car-quote): page /car-offer enrichie (loueur, modele, inclusions, prix/jour, reassurance, etapes)"
```

---

## Task 7 : Accusé client au submit (trou 3a)

**Files:**
- Modify: `src/lib/email.ts` (nouvelle fonction `sendCustomerRequestReceived`)
- Modify: `src/app/api/car-rental/submit/route.ts`

- [ ] **Step 1: Créer `sendCustomerRequestReceived`** dans `email.ts` (pattern identique à `sendCustomerQuoteEmail` : `kalimeraShell(inner)`, `resend.emails.send`, `FROM_EMAIL`, `replyTo: RELAY_EMAIL`). Signature :

```ts
export async function sendCustomerRequestReceived(opts: {
  email: string; locale: string; customerName?: string;
  request: { pickupLabel: string; dateFrom: string; dateTo: string; carTypeLabel: string };
  noAgency: boolean; // true si aucune agence dispo (email_failed)
}) { /* ... */ }
```
Copies (EN/FR ; DE/EL à compléter) :
- Sujet : « Your car rental request — Crete Direct » / « Votre demande de location — Crete Direct ».
- Corps `noAgency=false` : « We received your request and asked local rental agencies for a price. You'll get an offer shortly by email. If none reply, we'll let you know. » / FR équivalent.
- Corps `noAgency=true` : « We received your request, but no partner agency is available for these criteria right now. We'll get back to you. » / FR équivalent.
- Inclure le récap `request` (pickup, dates, type) dans le même style de carte que les autres emails.

- [ ] **Step 2: Appeler l'accusé dans `submit/route.ts`.** Récupérer la locale de la demande (`row.locale` — présent sur `row`, sinon `"en"`).

Dans le cas succès (avant `return NextResponse.json({ ok: true })`, après L72) :
```ts
const { sendCustomerRequestReceived } = await import("@/lib/email");
try {
  await sendCustomerRequestReceived({
    email: row.customer_email, locale: (row as { locale?: string }).locale ?? "en",
    customerName: row.customer_name,
    request: { pickupLabel: lead.pickupLabel, dateFrom: lead.dateFrom, dateTo: lead.dateTo, carTypeLabel: lead.carTypeLabel },
    noAgency: false,
  });
} catch (e) { console.error("[car-rental/submit] ack email failed:", e); }
```
Dans le cas `email_failed` (L66-70), avant le `return`, envoyer le même email avec `noAgency: true` (best-effort try/catch).

- [ ] **Step 3: Valider** — `npx tsc --noEmit` → 0. Aperçu HTML des deux variantes ouvert à l'écran.

- [ ] **Step 4: Commit**

```bash
git add src/lib/email.ts src/app/api/car-rental/submit/route.ts
git commit -m "feat(car-quote): accuse client au submit (+ variante aucune agence)"
```

---

## Task 8 : Cron notification de silence (trou 3b)

**Files:**
- Create: `src/app/api/cron/car-no-quote/route.ts`
- Modify: `vercel.json`
- Modify: `src/lib/email.ts` (fonction `sendCustomerNoQuoteYet`, ou réutiliser `sendCustomerRequestReceived` avec un 3ᵉ texte)

- [ ] **Step 1: Ajouter le texte « silence »**. Le plus simple : ajouter une fonction dédiée `sendCustomerNoQuoteYet(opts: { email; locale; customerName? })` dans `email.ts` (même pattern). Copie EN : « No agency has sent a price yet for your car rental request. We're still on it — we'll email you as soon as we have an offer. » / FR équivalent.

- [ ] **Step 2: Créer la route cron** (pattern du cron existant `/api/cron/reviews-cleanup` — s'en inspirer pour la protection d'accès, ex. header `authorization` = `Bearer ${process.env.CRON_SECRET}` si le repo l'utilise) :

```ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  // Demandes 'sent' depuis > 24h, sans devis, pas encore notifiées.
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: rows } = await supabase.from("car_requests")
    .select("id, locale, customer_email, customer_name")
    .eq("status", "sent").is("no_quote_notified_at", null).lt("created_at", cutoff);

  const { sendCustomerNoQuoteYet } = await import("@/lib/email");
  let notified = 0;
  for (const r of rows ?? []) {
    try {
      await sendCustomerNoQuoteYet({ email: r.customer_email, locale: r.locale ?? "en", customerName: r.customer_name });
      await supabase.from("car_requests").update({ no_quote_notified_at: new Date().toISOString() }).eq("id", r.id);
      notified++;
    } catch (e) { console.error("[cron/car-no-quote] failed for", r.id, e); }
  }
  return NextResponse.json({ ok: true, notified });
}
```
Si le cron existant vérifie un secret d'autorisation, reproduire exactement la même garde ici.

- [ ] **Step 3: Enregistrer le cron** dans `vercel.json` (ajouter à `crons`) :

```json
{
  "crons": [
    { "path": "/api/cron/reviews-cleanup", "schedule": "0 3 * * *" },
    { "path": "/api/cron/car-no-quote", "schedule": "0 * * * *" }
  ]
}
```

- [ ] **Step 4: Valider** — `npx tsc --noEmit` → 0. `npx next build` sans clé → route incluse, build vert.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/cron/car-no-quote/route.ts vercel.json src/lib/email.ts
git commit -m "feat(car-quote): cron notification silence (>24h sans devis, idempotent)"
```

---

## Task 9 : Expiration de l'offre (trou 4)

**Files:**
- Create: `src/lib/car-offer-expiry.ts`
- Modify: `src/app/[locale]/car-offer/[token]/page.tsx`
- Modify: `src/app/api/car-rental/accept/route.ts`

- [ ] **Step 1: Helper d'expiration** (source unique, réutilisée par la page et l'API) :

```ts
// L'offre expire au plus tôt entre 72h après le devis et le début de location.
export function offerExpiresAt(quotedAt: string | null, dateFrom: string | null): number | null {
  if (!quotedAt) return null;
  const q72 = new Date(quotedAt).getTime() + 72 * 60 * 60 * 1000;
  const start = dateFrom ? new Date(dateFrom + "T00:00:00").getTime() : Infinity;
  return Math.min(q72, start);
}
export function isOfferExpired(quotedAt: string | null, dateFrom: string | null, now: number): boolean {
  const exp = offerExpiresAt(quotedAt, dateFrom);
  return exp != null && now > exp;
}
```

- [ ] **Step 2: Bloquer l'acceptation expirée** (`accept/route.ts`). Le SELECT doit inclure `quoted_at, date_from`. Avant l'update `status: "accepted"`, ajouter :

```ts
import { isOfferExpired } from "@/lib/car-offer-expiry";
// après avoir chargé la row (avec quoted_at, date_from) :
if (isOfferExpired(row.quoted_at, row.date_from, Date.now())) {
  return NextResponse.json({ ok: false, expired: true }, { status: 410 });
}
```
Adapter `AcceptButton.tsx` pour afficher un message si la réponse contient `expired` (état d'erreur dédié, texte « This offer has expired » / i18n via prop).

- [ ] **Step 3: Afficher « expiré » sur la page** (`car-offer/[token]/page.tsx`). `quoted_at` et `date_from` sont déjà au SELECT (Task 6 a ajouté `quoted_at`). Ajouter une copie `expiredOffer` (distincte de `expired` = lien invalide) et, dans le bloc non-accepté, si `isOfferExpired(row.quoted_at, row.date_from, Date.now())`, rendre le message d'expiration au lieu du prix + bouton :

```tsx
import { isOfferExpired } from "@/lib/car-offer-expiry";
// dans le rendu, remplacer la condition du bloc "quoted" :
) : isOfferExpired(row.quoted_at, row.date_from, Date.now()) ? (
  <>
    <h1 style={{ margin: "0 0 6px", fontSize: 21, color: "#0B3954" }}>{c.title}</h1>
    <p style={{ margin: 0, color: "#5C7886", fontSize: 15, lineHeight: 1.6 }}>{c.expiredOffer}</p>
  </>
) : (
```
Copie `expiredOffer` (EN/FR ; DE/EL à compléter) : « This offer has expired. Send a new request and local agencies will quote you again. » / « Cette offre a expiré. Refaites une demande et les agences locales vous proposeront un nouveau prix. »

- [ ] **Step 4: Valider** — `npx tsc --noEmit` → 0. `npx next build` sans clé → vert.

- [ ] **Step 5: Commit**

```bash
git add src/lib/car-offer-expiry.ts "src/app/[locale]/car-offer/[token]/page.tsx" src/app/api/car-rental/accept/route.ts "src/app/[locale]/car-offer/[token]/AcceptButton.tsx"
git commit -m "feat(car-quote): expiration offre (72h ou date_from), blocage accept + message"
```

---

## Task 10 : i18n DE/EL + validation e2e finale

**Files:**
- Modify: `src/lib/car-inclusions.ts`, `src/lib/email.ts`, `src/app/[locale]/car-offer/[token]/page.tsx` (compléter DE/EL partout où EN/FR ont été ajoutés)

- [ ] **Step 1: Compléter DE et EL** pour toutes les chaînes ajoutées (inclusions déjà fournies en 4 langues en Task 3 ; à faire : `QUOTE_COPY` DE/EL des clés offerFrom/localAgency/included/perDay/total/reassure/steps ; `COPY` page DE/EL idem ; accusé + silence + expiredOffer DE/EL). Suivre exactement le style des entrées EN/FR voisines, accents/caractères grecs corrects.

- [ ] **Step 2: Valider build complet** — `npx tsc --noEmit` → 0 ; `npx next build` sans clé → 10635/10635, aucune erreur prerender.

- [ ] **Step 3: Test e2e manuel** (sur preview Vercel de la branche) :
  1. Soumettre une demande test via `/car-rental` → vérifier réception de l'**accusé** immédiat.
  2. Ouvrir le lien loueur `/car-quote/{token}`, saisir prix + modèle + 2 inclusions → envoyer.
  3. Vérifier l'**email devis** : loueur nommé, modèle, inclusions, prix total + /jour, réassurance, étapes.
  4. Ouvrir `/car-offer/{acceptToken}` → mêmes infos affichées.
  5. Accepter → statut `accepted` ; admin affiche « Choisi par le client : X ».
  6. Vérifier admin avant acceptation : « Devis reçu de X · en attente du client ».

- [ ] **Step 4: Commit + déploiement prod** (acte conscient, après validation Kami)

```bash
git add -p   # stager explicitement les fichiers i18n
git commit -m "feat(car-quote): i18n DE/EL complet + validation e2e"
git push origin feat/car-quote-ux:master   # preview
# après vérif preview + GO Kami :
git push origin feat/car-quote-ux:main      # production
```

---

## Self-review (couverture spec)

- Trou 1 (label gagnant) → Task 2. ✓
- Trou 2 (offre pauvre) → Tasks 3, 5, 6 (module inclusions, email, page). ✓
- Trou 3 (silence) → Task 7 (accusé) + Task 8 (cron relance silence). ✓
- Trou 4 (expiration) → Task 9. ✓
- Data (3 colonnes) → Task 1. ✓
- Champs loueur optionnels → Task 4. ✓
- i18n 4 langues → EN/FR au fil de l'eau, DE/EL consolidés Task 10. ✓
- Faits réassurance (3, validés, « annulation gratuite » exclue → via case loueur) → Tasks 5/6 `reassure` + inclusion `free_cancellation`. ✓
- Suites hors scope (relance J+1, anti-abus, first-come) → non planifiées ici (volontaire). ✓
