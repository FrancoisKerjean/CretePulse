# Car Rental Wizard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wizard lead-gen `/car-rental` (4 étapes, cartes cliquables, icônes véhicules maison) qui transmet chaque demande par email à Auto Smart Car Rental (10 % commission) avec copie contact@kairosguest.com, trace en DB `car_requests`, et architecture zones multi-partenaires.

**Architecture:** `car-partners.json` + lib pure de lookup (pattern taxi-partners), wizard client 4 étapes, API route POST (validation + honeypot + dédup + insert + Resend), encarts PromoBox sur les pages transport. Spec : `docs/superpowers/specs/2026-06-12-car-rental-wizard-design.md`.

**Tech Stack:** Next.js 16, Resend (`src/lib/email.ts`, FROM `Crete Direct <hello@crete.direct>`), supabaseAdmin (PostgREST service role), Plausible custom events.

**Dépend de :** plan near-me Task 1 (`src/lib/geo.ts`) et Task 2 (`useGeoPosition`) pour l'option "near me" de l'étape 1. Exécuter near-me d'abord.

**Conventions repo :** identiques au plan near-me (author git, push master+master:main, font-data/card-base/icônes maison, funnel discret).

---

### Task 1: Zones et partenaires `car-partners`

**Files:**
- Create: `src/data/car-partners.json`
- Create: `src/lib/car-partners.ts`
- Create: `scripts/check-car-partners.mjs`

- [ ] **Step 1: `src/data/car-partners.json`** (slugs = clés existantes de SLUG_COORDS, vérifiés) :

```json
{
  "zones": [
    { "id": "chania-west", "pickups": ["chania-airport", "chania", "kissamos", "paleochora", "kalyves", "georgioupolis"] },
    { "id": "rethymno", "pickups": ["rethymno", "plakias", "panormo", "bali"] },
    { "id": "heraklion-center", "pickups": ["heraklion", "hersonissos", "malia", "matala", "agia-galini", "gouves"] },
    { "id": "lasithi-east", "pickups": ["agios-nikolaos", "elounda", "sitia", "ierapetra", "makry-gyalos", "sisi"] }
  ],
  "partners": [
    {
      "zoneIds": ["chania-west"],
      "name": "Auto Smart Car Rental",
      "email": "autosmartrental@gmail.com",
      "phone": "+306974147291",
      "whatsapp": "+306974147291",
      "website": "https://chaniacarrental.gr",
      "commission": 0.10,
      "since": "2026-05-12"
    }
  ]
}
```

- [ ] **Step 2: `src/lib/car-partners.ts`** (pur, importable client/serveur/node) :

```typescript
import data from "@/data/car-partners.json";

export interface CarZone { id: string; pickups: string[] }
export interface CarPartner {
  zoneIds: string[]; name: string; email: string; phone: string;
  whatsapp?: string; website?: string; commission: number; since: string;
}

export const CAR_ZONES: CarZone[] = data.zones;
export const CAR_PARTNERS: CarPartner[] = data.partners;

export function zoneForPickup(pickupSlug: string): CarZone | null {
  return CAR_ZONES.find((z) => z.pickups.includes(pickupSlug)) ?? null;
}

export function partnerForPickup(pickupSlug: string): (CarPartner & { zone: CarZone }) | null {
  const zone = zoneForPickup(pickupSlug);
  if (!zone) return null;
  const p = CAR_PARTNERS.find((p) => p.zoneIds.includes(zone.id));
  return p ? { ...p, zone } : null;
}

/** Tous les pickups, flagués servis ou non — alimente l'étape 1 du wizard. */
export function allPickups(): Array<{ slug: string; zoneId: string; served: boolean }> {
  return CAR_ZONES.flatMap((z) => {
    const served = CAR_PARTNERS.some((p) => p.zoneIds.includes(z.id));
    return z.pickups.map((slug) => ({ slug, zoneId: z.id, served }));
  });
}
```

- [ ] **Step 3: `scripts/check-car-partners.mjs`** :

```javascript
// node --experimental-strip-types scripts/check-car-partners.mjs
import { zoneForPickup, partnerForPickup, allPickups } from "../src/lib/car-partners.ts";
import { SLUG_COORDS } from "../src/lib/taxi-fare.ts";

let fail = 0;
const ok = (n, c) => { console.log(c ? `ok - ${n}` : `FAIL - ${n}`); if (!c) fail++; };

ok("chania-airport -> chania-west", zoneForPickup("chania-airport")?.id === "chania-west");
ok("partner west = Auto Smart", partnerForPickup("chania")?.name === "Auto Smart Car Rental");
ok("east has no partner yet", partnerForPickup("sitia") === null);
ok("unknown pickup -> null", zoneForPickup("nope") === null);
ok("every pickup slug has coords", allPickups().every((p) => SLUG_COORDS[p.slug]));
ok("served flags", allPickups().find((p) => p.slug === "chania").served === true
  && allPickups().find((p) => p.slug === "ierapetra").served === false);

process.exit(fail ? 1 : 0);
```

- [ ] **Step 4: Vérifier** — `node --experimental-strip-types scripts/check-car-partners.mjs` tout ok. (Si l'import JSON échoue en strip-types, passer la data en const TS dans car-partners.ts et supprimer le JSON — décision à l'exécution, le JSON n'est pas sacré.)

- [ ] **Step 5: Commit** — `git commit -m "feat(car-rental): zones + partners data layer (Auto Smart, chania-west, 10%)"`

---

### Task 2: Icônes véhicules + CAR_TYPES

**Files:**
- Modify: `src/components/icons.tsx` (fin de fichier)
- Create: `src/lib/car-types.ts`

- [ ] **Step 1:** Dessiner 5 icônes dans le langage maison (grille 24, trait 1.75, bouclette/vague signature discrète, modèle : CiTaxi `src/components/icons.tsx:159-170`) : `CiCarCity` (silhouette courte 2 portes), `CiCarCompact` (berline compacte), `CiCarSuv` (haute, garde au sol), `CiCarFamily` (longue, 3 vitres), `CiScooter`. Exemple CiCarCity :

```tsx
/** Citadine compacte, profil arrondi. */
export function CiCarCity(props: P) {
  return (
    <Svg {...props}>
      <path d="M5 11.2l1.4-3A1.8 1.8 0 0 1 8 7.2h5.4a1.8 1.8 0 0 1 1.6 1l1.5 3" />
      <path d="M3.6 16V14a2.8 2.8 0 0 1 2.8-2.8h10.2a2.8 2.8 0 0 1 2.8 2.8v2" />
      <circle cx="7.2" cy="16.8" r="1.7" />
      <circle cx="16.2" cy="16.8" r="1.7" />
      <path d="M8.9 16.8h5.6" strokeWidth={1.4} />
      <path d="M19.4 11.1q1-.9 0-1.8" strokeWidth={1.4} />
    </Svg>
  );
}
```
Les 4 autres : varier longueur de caisse, hauteur, nombre de fenêtres (traits verticaux), CiScooter = roue avant + guidon + plateau. Vérifier visuellement sur une page de test jetable locale (ou la planche d'essai utilisée pour les 16 icônes du 11/06 si elle existe encore) avant commit.

- [ ] **Step 2: `src/lib/car-types.ts`** :

```typescript
import type { ComponentType, SVGProps } from "react";
import { CiCarCity, CiCarCompact, CiCarSuv, CiCarFamily, CiScooter } from "@/components/icons";

export interface CarType {
  id: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  pax: string; // indicatif, affiché font-data
  labels: Record<string, string>; // en/fr/de/el
}

// Flotte générique au lancement — affiner quand Panagoula confirme sa flotte (butoir Kami 19/06/2026).
export const CAR_TYPES: CarType[] = [
  { id: "city",    icon: CiCarCity,    pax: "2-4", labels: { en: "City car", fr: "Citadine", de: "Kleinwagen", el: "Μικρό αυτοκίνητο" } },
  { id: "compact", icon: CiCarCompact, pax: "4-5", labels: { en: "Compact", fr: "Compacte", de: "Kompaktklasse", el: "Κόμπακτ" } },
  { id: "suv",     icon: CiCarSuv,     pax: "5",   labels: { en: "SUV / 4x4", fr: "SUV / 4x4", de: "SUV / 4x4", el: "SUV / 4x4" } },
  { id: "family",  icon: CiCarFamily,  pax: "5-7", labels: { en: "Family / 7 seats", fr: "Familiale / 7 places", de: "Familienauto / 7 Sitze", el: "Οικογενειακό / 7 θέσεις" } },
  { id: "scooter", icon: CiScooter,    pax: "1-2", labels: { en: "Scooter / ATV", fr: "Scooter / quad", de: "Roller / Quad", el: "Σκούτερ / ATV" } },
];
```

- [ ] **Step 3: Vérifier** — `npx tsc --noEmit` 0.

- [ ] **Step 4: Commit** — `git commit -m "feat(icons): house-style vehicle icons + CAR_TYPES catalog"`

---

### Task 3: Table `car_requests` (Postgres VPS)

**Files:**
- Create: `supabase/migrations/20260612_car_requests.sql`

- [ ] **Step 1: Écrire la migration** :

```sql
-- Leads location de voiture (wizard /car-rental). INSERT service_role only,
-- aucun accès anon (données personnelles).
create table if not exists public.car_requests (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  locale text not null default 'en',
  pickup_slug text not null,
  zone_id text not null,
  partner_name text not null,
  partner_email text not null,
  date_from date not null,
  time_from text,
  date_to date not null,
  time_to text,
  flight_no text,
  car_type text not null,
  pax smallint,
  customer_name text not null,
  customer_email text not null,
  customer_phone text,
  note text,
  source text, -- page d'origine (?pickup= contextuel)
  status text not null default 'sent' -- sent | email_failed
);
create index if not exists car_requests_created_idx on public.car_requests (created_at desc);
create index if not exists car_requests_dedup_idx on public.car_requests (customer_email, pickup_slug, date_from);

revoke all on public.car_requests from anon, web_anon;
grant insert, select on public.car_requests to service_role;
```
  ⚠️ Vérifier dans `supabase/schema.sql` + `init/00-roles.sql` les noms de rôles réels du PostgREST self-hosted (`web_anon` vs `anon`, nom du rôle service) et ajuster les grants à l'identique des autres tables à écriture service (modèle : `newsletter_subscribers`).

- [ ] **Step 2: Appliquer sur le VPS** (Postgres self-hosted kairos-vps, PAS Supabase cloud) :
`ssh kairos-vps "docker exec -i cretepulse-db-postgres-1 psql -U postgres -d cretepulse" < supabase/migrations/20260612_car_requests.sql` — adapter le nom du conteneur (`docker ps` sur le VPS, stack `/opt/cretepulse-db`). Vérifier : `\d car_requests` listée. ⚠️ Pas pendant un deploy Vercel en cours (contention connue).

- [ ] **Step 3: Commit** — `git commit -m "feat(db): car_requests table migration"`

---

### Task 4: API `POST /api/car-rental/submit`

**Files:**
- Create: `src/app/api/car-rental/submit/route.ts`
- Modify: `src/lib/email.ts` (ajouter `sendCarLeadEmail`)

- [ ] **Step 1: `sendCarLeadEmail` dans `src/lib/email.ts`** (suivre le style du fichier, FROM existant) :

```typescript
export interface CarLead {
  pickupLabel: string; dateFrom: string; timeFrom?: string; dateTo: string; timeTo?: string;
  flightNo?: string; carTypeLabel: string; pax?: number;
  customerName: string; customerEmail: string; customerPhone?: string; note?: string;
}

export async function sendCarLeadEmail(partnerEmail: string, partnerName: string, lead: CarLead) {
  const subject = `New rental request — ${lead.pickupLabel} ${lead.dateFrom} → ${lead.dateTo} (${lead.carTypeLabel}${lead.pax ? `, ${lead.pax} pax` : ""})`;
  const lines = [
    `Hi ${partnerName.split(" ")[0]},`,
    ``,
    `New rental request via crete.direct (Kami's referral partnership, 10%):`,
    ``,
    `Pickup / drop-off: ${lead.pickupLabel}`,
    `Arrival: ${lead.dateFrom}${lead.timeFrom ? ` at ${lead.timeFrom}` : ""}${lead.flightNo ? ` (flight ${lead.flightNo})` : ""}`,
    `Departure: ${lead.dateTo}${lead.timeTo ? ` at ${lead.timeTo}` : ""}`,
    `Car type: ${lead.carTypeLabel}`,
    `People: ${lead.pax ?? "-"}`,
    ``,
    `Customer: ${lead.customerName}`,
    `Email: ${lead.customerEmail}`,
    `Phone / WhatsApp: ${lead.customerPhone ?? "-"}`,
    lead.note ? `Note: ${lead.note}` : ``,
    ``,
    `Please reply directly to the customer (reply-to is set).`,
  ].filter((l) => l !== ``  || true);
  return resend.emails.send({
    from: FROM_EMAIL,
    to: partnerEmail,
    cc: "contact@kairosguest.com", // preuve horodatée de l'apport (10%)
    replyTo: lead.customerEmail,
    subject,
    text: lines.join("\n"),
  });
}
```
  (Adapter `resend`/`FROM_EMAIL` aux identifiants réels exportés/privés du fichier ; `replyTo` est le nom de champ Resend SDK actuel — vérifier la version installée, sinon `reply_to`.)

- [ ] **Step 2: `route.ts`** — pattern complet de `src/app/api/newsletter/subscribe/route.ts` (honeypot `website`, EMAIL_REGEX, silent success) :

```typescript
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { partnerForPickup } from "@/lib/car-partners";
import { CAR_TYPES } from "@/lib/car-types";
import { SLUG_COORDS } from "@/lib/taxi-fare";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const label = (slug: string) => slug.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  if (body.website && String(body.website).trim() !== "") return NextResponse.json({ ok: true }); // honeypot

  const pickup = String(body.pickup ?? "");
  const carType = CAR_TYPES.find((c) => c.id === body.carType);
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";
  const dateFrom = String(body.dateFrom ?? ""); const dateTo = String(body.dateTo ?? "");
  const partner = partnerForPickup(pickup);

  if (!partner) return NextResponse.json({ error: "No partner in this area yet" }, { status: 400 });
  if (!SLUG_COORDS[pickup] || !carType || !name || !EMAIL_REGEX.test(email)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 422 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateFrom) || !/^\d{4}-\d{2}-\d{2}$/.test(dateTo) || dateTo < dateFrom) {
    return NextResponse.json({ error: "Invalid dates" }, { status: 422 });
  }

  // Dédup : même email + pickup + dateFrom dans les 10 min → silent success
  const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data: dup } = await supabase.from("car_requests").select("id")
    .eq("customer_email", email).eq("pickup_slug", pickup).eq("date_from", dateFrom)
    .gte("created_at", tenMinAgo).limit(1);
  if (dup && dup.length > 0) return NextResponse.json({ ok: true });

  const row = {
    locale: typeof body.locale === "string" ? body.locale : "en",
    pickup_slug: pickup, zone_id: partner.zone.id,
    partner_name: partner.name, partner_email: partner.email,
    date_from: dateFrom, time_from: str(body.timeFrom), date_to: dateTo, time_to: str(body.timeTo),
    flight_no: str(body.flightNo), car_type: carType.id,
    pax: Number.isInteger(body.pax) ? (body.pax as number) : null,
    customer_name: name, customer_email: email, customer_phone: str(body.phone),
    note: str(body.note)?.slice(0, 500) ?? null, source: str(body.source), status: "sent",
  };
  function str(v: unknown): string | null { return typeof v === "string" && v.trim() ? v.trim() : null; }

  const { data: inserted, error } = await supabase.from("car_requests").insert(row).select("id").single();
  if (error) console.error("[car-rental/submit] insert error:", error.message); // on tente quand même l'email

  try {
    const { sendCarLeadEmail } = await import("@/lib/email");
    await sendCarLeadEmail(partner.email, partner.name, {
      pickupLabel: label(pickup), dateFrom, timeFrom: row.time_from ?? undefined,
      dateTo, timeTo: row.time_to ?? undefined, flightNo: row.flight_no ?? undefined,
      carTypeLabel: carType.labels.en, pax: row.pax ?? undefined,
      customerName: name, customerEmail: email, customerPhone: row.customer_phone ?? undefined,
      note: row.note ?? undefined,
    });
  } catch (e) {
    console.error("[car-rental/submit] email error:", e);
    if (inserted) await supabase.from("car_requests").update({ status: "email_failed" }).eq("id", inserted.id);
    // Le front affichera le WhatsApp de l'agence en secours
    return NextResponse.json({ ok: false, fallbackWhatsapp: partner.whatsapp ?? partner.phone });
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Tester l'API en local** (dev server, DB VPS joignable) :
  - payload valide pickup `chania` → `{ ok: true }`, row en DB (`status=sent`), email réel parti ? NON en test : mettre `RESEND_API_KEY` factice en local → branche email_failed attendue avec fallbackWhatsapp → vérifier la row `email_failed`. (Ne PAS envoyer de vrais emails de test à Panagoula.)
  - pickup `sitia` → 400 "No partner in this area yet".
  - honeypot rempli → `{ok:true}` sans row.
  - re-POST identique sous 10 min → `{ok:true}` sans nouvelle row.

- [ ] **Step 4: Commit** — `git commit -m "feat(car-rental): lead submission API — insert + partner email with kairos cc"`

---

### Task 5: Wizard client + page

**Files:**
- Create: `src/components/car-rental/CarRentalWizard.tsx`
- Create: `src/app/[locale]/car-rental/page.tsx`

- [ ] **Step 1: `CarRentalWizard.tsx`** — client. États : `step (1-4)`, `pickup`, `dateFrom/timeFrom/dateTo/timeTo/flightNo`, `carType`, `pax`, `name/email/phone/note`, `submitting`, `result`. Comportement :
  - Init : `?pickup=` (searchParams) si slug valide → step 2 directement.
  - **Étape 1** : grille de cartes-boutons par zone (`allPickups()` groupés par zoneId, titres de zone EN/FR/DE/EL "Chania & the west" etc.), icône CiPlane pour `*-airport`, CiMark sinon, nom Title Case. Bouton "Near me" (useGeoPosition) → sélectionne le pickup le plus proche (`nearestBy`). Pickups `served: false` : cliquables mais à l'étape finale → écran "No partner in this area yet" (texte honnête + lien `/partners` + suggestion du pickup servi le plus proche calculé par nearestBy depuis ses coords) — AUCUN envoi.
  - **Étape 2** : `input type="date"` ×2 (min = aujourd'hui, défauts demain/+7j) + `input type="time"` ×2 optionnels + vol optionnel (placeholder "A3 350"). Libellés explicites "Arrival / pick-up" et "Departure / drop-off" (exigence Panagoula).
  - **Étape 3** : cartes CAR_TYPES (icône 40px, label locale, pax `font-data`) + stepper passagers 1-8.
  - **Étape 4** : prénom+nom, email requis, téléphone/WhatsApp optionnel, note optionnelle, champ honeypot `website` masqué (`className="hidden"`, `tabIndex={-1}`, `autoComplete="off"`), ligne RGPD : "Your details are sent to the local partner agency so they can reply with a quote. Nothing else." POST `/api/car-rental/submit`, bouton disabled pendant `submitting`.
  - **Confirmation** : ok → "Request sent to Auto Smart Car Rental. They reply directly with a quote — you pay the agency, cash accepted, no prepayment." ; `ok:false` → message + lien `https://wa.me/<fallbackWhatsapp>` prérempli.
  - Barre de progression 4 segments (`bg-sun` actif), back/next, tout `card-base`, données chiffrées `font-data`.
  - Events : `window.plausible?.("Car Lead", { props: { zone, pickup, carType, source } })` au succès ; `("Car Wizard Step", {props:{step}})` à chaque avancée.
  - i18n : `const T = { en, fr, de, el }` inline complet, fallback EN.

- [ ] **Step 2: `page.tsx`** — server : metadata 4 langues (title EN "Rent a car in Crete — local agency, fair price, no prepayment"), buildAlternates `/car-rental`, generateStaticParams, JSON-LD `@graph` : WebPage + BreadcrumbList + FAQPage (4 Q/A locale : prepayment? cash? insurance? airport pickup?) — helper dans `src/lib/schema.ts` pattern `weatherPageSchema`. Contenu SSR : H1 + intro honnête (partenaire local, étiqueté, on touche une commission, le prix ne change pas pour toi — transparence brand) + `<CarRentalWizard locale={locale} />` + section éditoriale "Driving in Crete" (4 paragraphes : permis/IDP hors UE, assurance CDW lisible, routes de montagne + chèvres, parkings vieilles villes) 4 langues + FAQ visible miroir du JSON-LD.

- [ ] **Step 3: Vérifier** — build EXIT 0 ; Playwright FR : parcours complet `chania-airport` → étape 4 (mock route API via `page.route('**/api/car-rental/submit'`, fulfill `{ok:true}`) → écran confirmation ; parcours `sitia` → écran "no partner" sans POST ; `?pickup=chania` → arrive à l'étape 2.

- [ ] **Step 4: Commit** — `git commit -m "feat(car-rental): 4-step lead wizard + SEO page"`

---

### Task 6: Encarts, nav, sitemap

**Files:**
- Modify: `src/app/sitemap.xml/route.ts` (STATIC_PAGES + `/car-rental`)
- Modify: header nav (univers "Plan", même fichier que l'entrée near-me)
- Modify: `src/app/[locale]/airport/[slug]/page.tsx`, `src/app/[locale]/getting-around/page.tsx` (chemin à vérifier par Glob), `src/app/[locale]/near-me` (section), pages paires bus

- [ ] **Step 1:** PromoBox réutilisé partout (composant existant `src/components/PromoBox.tsx`) : title locale "Need a car?", line "Local partner agency — fair price, no prepayment, cash welcome", cta "Get a quote" → `/{locale}/car-rental?pickup=<slug contextuel>` , disclosure "Partner — we earn a commission". Slug contextuel : aéroports → `chania-airport`/`heraklion` ; getting-around → sans pickup ; paires bus → uniquement dans le rendu "no route found" du JourneyPlanner + pages paires dont `pairRoutes` est vide, pickup = placeA si dans une zone.
- [ ] **Step 2:** Sur les emplacements où le placeholder affilié DiscoverCars est rendu (chercher `DiscoverCars`/`discovercars` dans src/) : en zone couverte ouest, remplacer par le PromoBox partenaire ; ailleurs, laisser le placeholder.
- [ ] **Step 3:** Sitemap + entrée nav "Rent a car" univers Plan, 4 langues.
- [ ] **Step 4: Vérifier** — build + curl des pages touchées en dev (airport chania 200 avec encart, paire bus sans route → encart).
- [ ] **Step 5: Commit** — `git commit -m "feat(car-rental): promo placements, nav, sitemap"`

---

### Task 7: Rapport mensuel + déploiement

**Files:**
- Modify: `vps/partner_report.py`

- [ ] **Step 1:** Étendre `partner_report.py` (lire le script d'abord ; il tourne cron 1er du mois 05:00 UTC sur /opt/cretepulse) : nouvelle fonction `car_rental_section()` → GET PostgREST `car_requests?created_at=gte.<début mois précédent>&created_at=lt.<début mois courant>&select=id,pickup_slug,car_type,status` (service key, header existant du script) → par partenaire : nb leads transmis, nb email_failed, top pickups ; + clics outbound Plausible vers `chaniacarrental.gr` (réutiliser l'appel Stats API existant en changeant le filtre outbound url). Ajouter la section à l'email partenaire existant + à la copie contact@. Si 0 lead → ligne "No leads this month".
- [ ] **Step 2:** `python vps/partner_report.py --dry-run` en local (creds dans le .env du VPS — exécuter le dry-run SUR le VPS via ssh) → la section apparaît, aucune erreur.
- [ ] **Step 3:** Copier sur le VPS `/opt/cretepulse/partner_report.py` (scp), re-dry-run sur place. Le cron existant suffit (même script).
- [ ] **Step 4: Vérification finale build complet** — `npx tsc --noEmit` 0 ; `SUPABASE_SERVICE_KEY=dummy npm run build` EXIT 0 ; checks node 2/2 (`check-geo`, `check-car-partners`).
- [ ] **Step 5: Commit + deploy** — `git commit -m "feat(car-rental): monthly partner report section"` ; `git push origin master && git push origin master:main` ; vérifier Vercel Ready ; smoke prod : `https://crete.direct/en/car-rental` 200 + wizard rend ; `https://crete.direct/fr/car-rental` 200. PAS de POST de test en prod (email réel chez Panagoula) — la preuve e2e prod attend le premier vrai lead OU un test convenu avec Kami.

---

### Hors plan (mémoire, owner Kami butoir 19/06/2026)
Prévenir Panagoula (WhatsApp +30 6974147291) : leads automatiques structurés depuis crete.direct, volume potentiel ; demander couverture hors Chania + flotte réelle (ajuster CAR_TYPES + zones servies en éditant car-partners.json + car-types.ts, zéro refactor).
