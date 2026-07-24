# `/projet` variantes par public — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformer `/projet` (page communautaire Kriri) en une page qui va chercher du financement, avec trois publics (Visiteur / Institution / Entreprise) sur trois routes, dans la DA parcours existante, formulaires de lead intégrés.

**Architecture:** `/projet` (visiteur) reste tel quel + un `AudienceSwitch`. Deux nouvelles routes `/projet/institutions` et `/projet/entreprises` rendent un pipeline pro data-driven (`ProParcours`) qui réutilise `RoadDecor`, `Card`, `Reveal` et les scènes existantes, piloté par des objets `ProCopy` (FR/EN). Les formulaires postent vers `/api/projet-lead` (validation pure testée + envoi Resend, calqué sur le lead car-rental).

**Tech Stack:** Next.js 16 (App Router), TypeScript, Tailwind v4, next-intl, Motion (framer-motion v12), Resend. Tests = scripts `check-*.mjs` (node `--experimental-strip-types`) + Playwright + `tsc`, comme le reste du repo.

**Spec :** `docs/superpowers/specs/2026-06-17-projet-publics-design.md`.

**Conventions repo (NON NÉGOCIABLE, cf CLAUDE.md) :** branche `feat/projet-publics` (worktree `cretepulse-projet-publics`), `git add` explicite par fichier (jamais `-A`), author kerjeanfrancois29, pas de merge `master:main` sans GO Kami. Textes : accents FR/EN corrects, zéro tiret cadratin, zéro flèche dans les libellés.

---

### Task 0: Setup worktree (deps)

**Files:** aucun fichier versionné.

- [ ] **Step 1: Installer les dépendances dans le worktree**

Le worktree ne partage pas `node_modules` (motion absent sinon). Run :

```bash
cd /c/Users/fkerj/cretepulse-projet-publics && npm install
```

Expected: install OK, `node_modules/motion` présent.

- [ ] **Step 2: Vérifier le point de départ vert**

Run: `npx tsc --noEmit`
Expected: 0 erreur (HEAD = spec commité sur master `ef69ce3`).

---

### Task 1: Types & helpers de copy pro (`campagne-pro.ts`)

**Files:**
- Create: `src/lib/campagne-pro.ts`
- Create: `scripts/check-projet-copy.mjs`
- Modify: `package.json` (script `check:projet-copy` + ajout à `check`)

- [ ] **Step 1: Écrire le test (échoue : module absent)**

Create `scripts/check-projet-copy.mjs` :

```js
import assert from "node:assert";
import { getInstitutionsCopy, getEntreprisesCopy, PRO_AUDIENCES } from "../src/lib/campagne-pro.ts";
import { getInstitutionsCopyEN } from "../src/lib/campagne-institutions.ts";
import { getEntreprisesCopyEN } from "../src/lib/campagne-entreprises.ts";

const ALL = [getInstitutionsCopy("fr"), getInstitutionsCopy("en"), getEntreprisesCopy("fr"), getEntreprisesCopy("en")];

for (const c of ALL) {
  assert.ok(c.meta.title && c.meta.description, "meta complet");
  assert.ok(c.hero.title, "hero.title");
  assert.equal(c.stats.length, 4, "4 stats");
  assert.ok(c.beats.length >= 2, ">=2 beats");
  assert.equal(c.frise.steps.length, 3, "frise 3 temps");
  assert.ok(c.form && c.form.fields.length >= 3, "form >=3 champs");
}
// fallback locale inconnue => EN
assert.equal(getInstitutionsCopy("zz").meta.title, getInstitutionsCopy("en").meta.title, "fallback EN");
// zero tiret cadratin + zero fleche dans tout le texte serialise
const blob = JSON.stringify(ALL);
assert.ok(!blob.includes("—"), "aucun tiret cadratin");
assert.ok(!/[→←➔]|->/.test(blob), "aucune fleche");
// entreprises a des portes, institutions a un ask+dossier
assert.ok(getEntreprisesCopy("fr").doors?.length === 2, "2 portes entreprises");
assert.ok(getInstitutionsCopy("fr").ask?.dossierHref, "dossier institutions");
assert.deepEqual(PRO_AUDIENCES, ["visiteur", "institutions", "entreprises"]);
console.log("check-projet-copy OK");
```

- [ ] **Step 2: Run, vérifier l'échec**

Run: `node --experimental-strip-types scripts/check-projet-copy.mjs`
Expected: FAIL (Cannot find module `campagne-pro.ts`).

- [ ] **Step 3: Implémenter `src/lib/campagne-pro.ts`**

```ts
// Types + helpers partages des pages /projet pro (institutions, entreprises).
// Node-safe (aucun import react/next) pour etre testable par check-projet-copy.mjs.
import { getInstitutionsCopyFR, getInstitutionsCopyEN } from "./campagne-institutions.ts";
import { getEntreprisesCopyFR, getEntreprisesCopyEN } from "./campagne-entreprises.ts";

export const PRO_AUDIENCES = ["visiteur", "institutions", "entreprises"] as const;
export type ProAudience = (typeof PRO_AUDIENCES)[number];

// Variantes de pastille reutilisant celles de Card (terra | go | calm).
export type ProKicker = "terra" | "go" | "calm";
// Scenes existantes reutilisables (BeatRow.SCENES).
export type SceneKey = "terminal" | "busStop" | "signpost" | "phoneLive" | "summit" | "app" | "community";

export type ProStat = { n: string; l: string };
export type ProBeat = {
  id: string;
  kicker: string;
  kickerVariant: ProKicker;
  scene?: SceneKey;     // illustration reutilisee...
  emoji?: string;       // ...ou simple boite emoji
  emojiCap?: string;
  title: string;        // peut contenir <hl>...</hl>
  body?: string;
  flip?: boolean;       // scene a droite
};
export type ProFriseStep = { year: string; title: string; text: string; future?: boolean };
export type ProDoor = { id: string; emoji: string; title: string; body: string; cta: string; href: string };
export type ProFormField = { name: string; label: string; type?: "text" | "email"; required?: boolean; placeholder?: string };

export type ProCopy = {
  audience: ProAudience;
  meta: { title: string; description: string };
  hero: { kicker: string; kickerVariant: ProKicker; title: string; sub?: string };
  stats: ProStat[];
  hook?: string;
  beats: ProBeat[];
  frise: { kicker: string; title: string; sub?: string; steps: ProFriseStep[] };
  ask?: { kicker: string; title: string; body: string; dossierLabel: string; dossierHref: string };
  doors?: ProDoor[];
  form: {
    variant: "institution" | "sponsor";
    title: string; lead: string;
    fields: ProFormField[];
    submit: string; sending: string; sent: string; error: string;
  };
  crossLabel: string; // bas de page : liens vers les autres publics
};

// Libelles du selecteur de public (FR/EN), partages par les 3 routes.
export const AUDIENCE_LABELS: Record<string, Record<ProAudience, string>> = {
  fr: { visiteur: "Visiteur", institutions: "Institution", entreprises: "Entreprise" },
  en: { visiteur: "Visitor", institutions: "Institution", entreprises: "Business" },
};
export function audienceLabels(locale: string): Record<ProAudience, string> {
  return AUDIENCE_LABELS[locale] ?? AUDIENCE_LABELS.en;
}

export function getInstitutionsCopy(locale: string): ProCopy {
  return locale === "fr" ? getInstitutionsCopyFR() : getInstitutionsCopyEN();
}
export function getEntreprisesCopy(locale: string): ProCopy {
  return locale === "fr" ? getEntreprisesCopyFR() : getEntreprisesCopyEN();
}
```

- [ ] **Step 4: Ajouter le script npm**

Modify `package.json` scripts : ajouter `"check:projet-copy": "node --experimental-strip-types scripts/check-projet-copy.mjs"` et l'ajouter à la chaîne `check` (avant `tsc --noEmit`).

- [ ] **Step 5: (les copies n'existent pas encore → ce test passera après Task 2-3.)** Commit la fondation.

```bash
git add src/lib/campagne-pro.ts scripts/check-projet-copy.mjs package.json
git commit -m "feat(projet): types ProCopy + check-projet-copy"
```

---

### Task 2: Copy Institution (`campagne-institutions.ts`)

**Files:** Create `src/lib/campagne-institutions.ts`

- [ ] **Step 1: Implémenter (FR + EN), texte validé des mockups**

```ts
import type { ProCopy } from "./campagne-pro.ts";

export function getInstitutionsCopyFR(): ProCopy {
  return {
    audience: "institutions",
    meta: {
      title: "Notre projet, pour les institutions · crete.direct",
      description: "crete.direct, le premier referentiel unifie du transport cretois. Partenariat de donnees et co-financement, a la veille de Kastelli 2028.",
    },
    hero: {
      kicker: "le projet", kickerVariant: "go",
      title: "Le bus cretois, enfin <hl>sur une seule carte</hl>.",
      sub: "crete.direct est le premier referentiel unifie du transport de l'ile. Gratuit pour le public, ouvert au dialogue avec les autorites.",
    },
    stats: [
      { n: "2", l: "reseaux KTEL non relies" },
      { n: "6 M+", l: "visiteurs par an" },
      { n: "18 M", l: "pax Kastelli 2028" },
      { n: "1er", l: "agregateur bus de l'ile" },
    ],
    hook: "Le transport public d'une des plus grandes destinations d'Europe n'a aucune couche numerique unifiee. Nous l'avons batie, gratuite pour le public, et nous voulons la mettre au service de la gestion des flux.",
    beats: [
      { id: "constat", kicker: "le constat", kickerVariant: "terra", emoji: "\u{1F410}", emojiCap: "on attend... le bus arrive quand ?", flip: true,
        title: "Deux reseaux qui ne se parlent pas.",
        body: "Le bus interurbain cretois repose sur deux societes KTEL en silos : pas d'API, pas de donnee ouverte. Google Maps lui-meme ne sait pas y router un trajet. Et <hl>Kastelli 2028</hl> arrive sans plan de desserte collective." },
      { id: "bati", kicker: "ce qu'on a fait", kickerVariant: "go", scene: "signpost",
        title: "Le referentiel, on l'a deja <hl>construit</hl>.",
        body: "Le seul planificateur unifie des deux KTEL : 292 lignes, horaires, prix, en 22 langues. Une carte temps reel, et une traction reelle (trafic multiplie par 26 en 28 jours). Trafic aeroportuaire officiel, hebergements agreges, 2 296 points d'interet, meteo et mer en direct." },
    ],
    frise: {
      kicker: "notre cap",
      title: "De la donnee d'aujourd'hui aux lignes de <hl>2028</hl>.",
      sub: "On collecte, on relie, on anticipe. L'horizon : aider a dessiner des dessertes et lisser les flux touristiques de toute l'ile.",
      steps: [
        { year: "Aujourd'hui", title: "On collecte", text: "Horaires des deux KTEL, frequentation, trafic aerien, meteo et mer, unifies et multilingues." },
        { year: "Demain", title: "On modelise", text: "Croiser aeroport, hebergement, saison et evenements pour anticiper la pression par zone et par jour." },
        { year: "2028", title: "On propose des lignes", text: "Calibrer des dessertes a partir de la donnee, dont Kastelli, pour repartir les flux.", future: true },
      ],
    },
    ask: {
      kicker: "notre demande", title: "Construisons cette couche <hl>ensemble</hl>.",
      body: "Un rendez-vous pour explorer un partenariat de donnees (acces aux horaires KTEL), une reconnaissance comme partenaire flux de la Region, et le co-financement de l'infrastructure qui garde le service gratuit.",
      dossierLabel: "Telecharger le dossier (PDF)", dossierHref: "/dossiers/crete-direct-institutions-fr.pdf",
    },
    form: {
      variant: "institution",
      title: "Prendre contact", lead: "On repond sous 48h. Vos coordonnees servent uniquement a vous recontacter.",
      fields: [
        { name: "name", label: "Nom", required: true, placeholder: "Votre nom" },
        { name: "org", label: "Organisme", required: true, placeholder: "Region, office de tourisme, KTEL..." },
        { name: "role", label: "Fonction", placeholder: "Votre fonction" },
        { name: "email", label: "Email", type: "email", required: true, placeholder: "vous@organisme.gr" },
        { name: "message", label: "Objet", placeholder: "En quelques mots, ce que vous aimeriez explorer avec nous." },
      ],
      submit: "Envoyer la demande", sending: "Envoi...", sent: "Message envoye. Merci !", error: "Echec de l'envoi. Reessayez ou ecrivez a contact@kairosguest.com.",
    },
    crossLabel: "Vous etes une entreprise ?",
  };
}

export function getInstitutionsCopyEN(): ProCopy {
  return {
    audience: "institutions",
    meta: {
      title: "Our project, for institutions · crete.direct",
      description: "crete.direct, the first unified reference of Cretan transport. Data partnership and co-funding, ahead of Kastelli 2028.",
    },
    hero: {
      kicker: "the project", kickerVariant: "go",
      title: "Crete's buses, finally <hl>on one map</hl>.",
      sub: "crete.direct is the first unified reference of the island's transport. Free for the public, open to dialogue with the authorities.",
    },
    stats: [
      { n: "2", l: "unconnected KTEL networks" },
      { n: "6 M+", l: "visitors per year" },
      { n: "18 M", l: "pax Kastelli 2028" },
      { n: "1st", l: "island-wide bus aggregator" },
    ],
    hook: "The public transport of one of Europe's largest destinations has no unified digital layer. We built it, free for the public, and we want to put it at the service of flow management.",
    beats: [
      { id: "constat", kicker: "the problem", kickerVariant: "terra", emoji: "\u{1F410}", emojiCap: "waiting... when is the bus coming?", flip: true,
        title: "Two networks that don't talk to each other.",
        body: "Cretan intercity buses run on two siloed KTEL companies: no API, no open data. Google Maps itself cannot route a trip. And <hl>Kastelli 2028</hl> is coming with no collective transport plan." },
      { id: "bati", kicker: "what we built", kickerVariant: "go", scene: "signpost",
        title: "The reference, we already <hl>built it</hl>.",
        body: "The only unified planner across both KTEL networks: 292 routes, timetables, fares, in 22 languages. A real-time map, and real traction (traffic up 26x in 28 days). Official airport traffic, aggregated accommodation, 2,296 points of interest, live weather and sea." },
    ],
    frise: {
      kicker: "our direction",
      title: "From today's data to the lines of <hl>2028</hl>.",
      sub: "We collect, connect, anticipate. The horizon: help design services and smooth tourist flows across the island.",
      steps: [
        { year: "Today", title: "We collect", text: "Timetables of both KTEL, footfall, air traffic, weather and sea, unified and multilingual." },
        { year: "Tomorrow", title: "We model", text: "Cross airport, accommodation, season and events to anticipate pressure by area and by day." },
        { year: "2028", title: "We propose lines", text: "Calibrate services from the data, including Kastelli, to redistribute flows.", future: true },
      ],
    },
    ask: {
      kicker: "our ask", title: "Let's build this layer <hl>together</hl>.",
      body: "A meeting to explore a data partnership (access to KTEL timetables), recognition as a flow partner of the Region, and co-funding of the infrastructure that keeps the service free.",
      dossierLabel: "Download the dossier (PDF)", dossierHref: "/dossiers/crete-direct-institutions-en.pdf",
    },
    form: {
      variant: "institution",
      title: "Get in touch", lead: "We reply within 48h. Your details are only used to get back to you.",
      fields: [
        { name: "name", label: "Name", required: true, placeholder: "Your name" },
        { name: "org", label: "Organisation", required: true, placeholder: "Region, tourism board, KTEL..." },
        { name: "role", label: "Role", placeholder: "Your role" },
        { name: "email", label: "Email", type: "email", required: true, placeholder: "you@organisation.gr" },
        { name: "message", label: "Subject", placeholder: "In a few words, what you would like to explore with us." },
      ],
      submit: "Send", sending: "Sending...", sent: "Message sent. Thank you!", error: "Sending failed. Try again or email contact@kairosguest.com.",
    },
    crossLabel: "Are you a business?",
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/campagne-institutions.ts
git commit -m "feat(projet): copy Institution FR/EN"
```

---

### Task 3: Copy Entreprise (`campagne-entreprises.ts`)

**Files:** Create `src/lib/campagne-entreprises.ts`

- [ ] **Step 1: Implémenter (FR + EN)**

```ts
import type { ProCopy } from "./campagne-pro.ts";

export function getEntreprisesCopyFR(): ProCopy {
  return {
    audience: "entreprises",
    meta: {
      title: "Notre projet, pour les entreprises · crete.direct",
      description: "Associez votre marque au compagnon pratique de la Crete. Soutenez le projet, ou rendez-vous visible aupres d'une audience qualifiee.",
    },
    hero: {
      kicker: "partenariat", kickerVariant: "terra",
      title: "Associez votre marque au <hl>compagnon de la Crete</hl>.",
      sub: "Des centaines de milliers de visiteurs preparent leur sejour avec crete.direct, dans leur langue.",
    },
    stats: [
      { n: "22", l: "langues servies" },
      { n: "x26", l: "trafic en 28 jours" },
      { n: "~74%", l: "du trafic sur les bus" },
      { n: "0 pub", l: "intrusive, 0 tracking" },
    ],
    hook: "crete.direct est independant, gratuit et le restera. Pour aller plus loin (plus de bus en direct, une application, l'horizon 2028), nous ouvrons deux facons de nous rejoindre.",
    beats: [
      { id: "audience", kicker: "l'audience", kickerVariant: "go", emoji: "\u{1F4C8}", emojiCap: "22 langues · x26 en 28 jours · ~74% sur les bus", flip: true,
        title: "Une audience qui <hl>prepare</hl>, pas qui zappe.",
        body: "Voyageurs et locaux qui cherchent un bus, une plage, la meteo. Une intention forte, captee dans 22 langues. Service independant, gratuit, zero pub intrusive, zero tracking. Votre marque dans un cadre propre." },
    ],
    frise: {
      kicker: "pourquoi maintenant",
      title: "On construit la <hl>couche de mobilite</hl> de la Crete.",
      sub: "La donnee qu'on recolte aujourd'hui devient, a l'horizon 2028, un outil pour mieux repartir les flux. Un terrain ou une marque locale a tout interet a se positionner tot.",
      steps: [
        { year: "Aujourd'hui", title: "Une audience qui prepare", text: "Une intention forte, multilingue, sur les bus, les plages et la meteo." },
        { year: "Demain", title: "Plus de direct", text: "Davantage de bus en temps reel sur toute l'ile, et une application dediee." },
        { year: "2028", title: "La couche de mobilite", text: "La donnee qui aide a repartir les flux touristiques de l'ile.", future: true },
      ],
    },
    doors: [
      { id: "sponsor", emoji: "\u{1FAF6}", title: "Soutenir le projet",
        body: "Financez l'infrastructure (serveurs, donnees) qui garde le service gratuit. En echange, une mention Plateforme soutenue par votre marque, visible et honnete.",
        cta: "Devenir sponsor", href: "#sponsor-form" },
      { id: "visible", emoji: "\u{1F4CD}", title: "Etre visible",
        body: "Vous etes un acteur du tourisme (transport, location, activites) ? Apparaissez aupres de nos visiteurs via l'offre partenaires.",
        cta: "Voir l'offre partenaires", href: "/partners" },
    ],
    form: {
      variant: "sponsor",
      title: "Devenir sponsor", lead: "On revient vers vous pour caler les details. Aucune grille de prix imposee : on construit ensemble.",
      fields: [
        { name: "name", label: "Nom", required: true, placeholder: "Votre nom" },
        { name: "company", label: "Entreprise", required: true, placeholder: "Nom de l'entreprise" },
        { name: "email", label: "Email", type: "email", required: true, placeholder: "vous@entreprise.com" },
        { name: "website", label: "Site web (optionnel)", placeholder: "https://" },
        { name: "message", label: "Votre message", placeholder: "Ce qui vous motive a soutenir crete.direct, et le niveau d'engagement envisage." },
      ],
      submit: "Envoyer ma proposition", sending: "Envoi...", sent: "Proposition envoyee. Merci !", error: "Echec de l'envoi. Reessayez ou ecrivez a contact@kairosguest.com.",
    },
    crossLabel: "Vous etes une institution ?",
  };
}

export function getEntreprisesCopyEN(): ProCopy {
  return {
    audience: "entreprises",
    meta: {
      title: "Our project, for businesses · crete.direct",
      description: "Put your brand alongside Crete's practical companion. Support the project, or get visible to a qualified audience.",
    },
    hero: {
      kicker: "partnership", kickerVariant: "terra",
      title: "Put your brand alongside <hl>Crete's companion</hl>.",
      sub: "Hundreds of thousands of visitors plan their trip with crete.direct, in their own language.",
    },
    stats: [
      { n: "22", l: "languages served" },
      { n: "x26", l: "traffic in 28 days" },
      { n: "~74%", l: "of traffic on buses" },
      { n: "0 ads", l: "intrusive, 0 tracking" },
    ],
    hook: "crete.direct is independent, free and will stay that way. To go further (more live buses, an app, the 2028 horizon), we open two ways to join us.",
    beats: [
      { id: "audience", kicker: "the audience", kickerVariant: "go", emoji: "\u{1F4C8}", emojiCap: "22 languages · 26x in 28 days · ~74% on buses", flip: true,
        title: "An audience that <hl>plans</hl>, not that zaps.",
        body: "Travellers and locals looking for a bus, a beach, the weather. Strong intent, captured in 22 languages. Independent, free, zero intrusive ads, zero tracking. Your brand in a clean setting." },
    ],
    frise: {
      kicker: "why now",
      title: "We're building Crete's <hl>mobility layer</hl>.",
      sub: "The data we collect today becomes, by 2028, a tool to better distribute flows. A field where a local brand has every interest in getting in early.",
      steps: [
        { year: "Today", title: "An audience that plans", text: "Strong, multilingual intent on buses, beaches and weather." },
        { year: "Tomorrow", title: "More live", text: "More real-time buses across the island, and a dedicated app." },
        { year: "2028", title: "The mobility layer", text: "Data that helps redistribute the island's tourist flows.", future: true },
      ],
    },
    doors: [
      { id: "sponsor", emoji: "\u{1FAF6}", title: "Support the project",
        body: "Fund the infrastructure (servers, data) that keeps the service free. In return, a Platform supported by your brand mention, visible and honest.",
        cta: "Become a sponsor", href: "#sponsor-form" },
      { id: "visible", emoji: "\u{1F4CD}", title: "Get visible",
        body: "Are you a tourism player (transport, rental, activities)? Appear to our visitors through the partners offer.",
        cta: "See the partners offer", href: "/partners" },
    ],
    form: {
      variant: "sponsor",
      title: "Become a sponsor", lead: "We get back to you to sort out the details. No price grid imposed: we build it together.",
      fields: [
        { name: "name", label: "Name", required: true, placeholder: "Your name" },
        { name: "company", label: "Company", required: true, placeholder: "Company name" },
        { name: "email", label: "Email", type: "email", required: true, placeholder: "you@company.com" },
        { name: "website", label: "Website (optional)", placeholder: "https://" },
        { name: "message", label: "Your message", placeholder: "What motivates you to support crete.direct, and the level of engagement you have in mind." },
      ],
      submit: "Send my proposal", sending: "Sending...", sent: "Proposal sent. Thank you!", error: "Sending failed. Try again or email contact@kairosguest.com.",
    },
    crossLabel: "Are you an institution?",
  };
}
```

- [ ] **Step 2: Run le check copy (doit passer maintenant) + commit**

Run: `node --experimental-strip-types scripts/check-projet-copy.mjs`
Expected: `check-projet-copy OK`.

```bash
git add src/lib/campagne-entreprises.ts
git commit -m "feat(projet): copy Entreprise FR/EN + check vert"
```

---

### Task 4: Validation pure du lead (`projet-lead.ts`)

**Files:**
- Create: `src/lib/projet-lead.ts`
- Create: `scripts/check-projet-lead.mjs`
- Modify: `package.json` (script `check:projet-lead` + chaîne `check`)

- [ ] **Step 1: Écrire le test (échoue)**

Create `scripts/check-projet-lead.mjs` :

```js
import assert from "node:assert";
import { validateProjetLead } from "../src/lib/projet-lead.ts";

// honeypot
assert.equal(validateProjetLead({ kind: "institution", hp: "x", name: "A", email: "a@b.co", org: "R" }).kind, "honeypot");
// kind invalide
assert.equal(validateProjetLead({ kind: "spam", name: "A", email: "a@b.co" }).kind, "error");
// email invalide
assert.equal(validateProjetLead({ kind: "sponsor", name: "A", email: "nope", company: "C" }).kind, "error");
// institution sans organisme
assert.equal(validateProjetLead({ kind: "institution", name: "A", email: "a@b.co" }).kind, "error");
// sponsor sans entreprise
assert.equal(validateProjetLead({ kind: "sponsor", name: "A", email: "a@b.co" }).kind, "error");
// ok institution
const okI = validateProjetLead({ kind: "institution", name: "  Maria ", email: "M@Org.GR", org: "Region", role: "Dir", message: "hello", locale: "fr" });
assert.equal(okI.kind, "ok");
assert.equal(okI.lead.email, "m@org.gr");
assert.equal(okI.lead.name, "Maria");
assert.equal(okI.lead.org, "Region");
// ok sponsor
const okS = validateProjetLead({ kind: "sponsor", name: "Jo", email: "jo@co.com", company: "Co", website: "https://co.com" });
assert.equal(okS.kind, "ok");
assert.equal(okS.lead.company, "Co");
console.log("check-projet-lead OK");
```

- [ ] **Step 2: Run, vérifier l'échec**

Run: `node --experimental-strip-types scripts/check-projet-lead.mjs`
Expected: FAIL (module absent).

- [ ] **Step 3: Implémenter `src/lib/projet-lead.ts`**

```ts
// Validation pure du lead /projet (institution | sponsor). Zero I/O, node-safe.
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ProjetLeadKind = "institution" | "sponsor";
export type ProjetLead = {
  kind: ProjetLeadKind;
  locale: string;
  name: string;
  email: string;
  org: string | null;
  role: string | null;
  company: string | null;
  website: string | null;
  message: string | null;
};
export type ProjetLeadResult =
  | { kind: "honeypot" }
  | { kind: "error"; status: number; error: string }
  | { kind: "ok"; lead: ProjetLead };

const str = (v: unknown, max = 500): string | null =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;

export function validateProjetLead(body: Record<string, unknown>): ProjetLeadResult {
  // honeypot (champ cache `hp`) rempli => bot, succes silencieux
  if (body.hp && String(body.hp).trim() !== "") return { kind: "honeypot" };

  const kind = body.kind;
  if (kind !== "institution" && kind !== "sponsor") return { kind: "error", status: 400, error: "Invalid kind" };

  const name = str(body.name, 120);
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!name || !EMAIL_REGEX.test(email)) return { kind: "error", status: 422, error: "Invalid request" };

  const org = str(body.org, 160);
  const company = str(body.company, 160);
  if (kind === "institution" && !org) return { kind: "error", status: 422, error: "Organisation required" };
  if (kind === "sponsor" && !company) return { kind: "error", status: 422, error: "Company required" };

  return {
    kind: "ok",
    lead: {
      kind, name, email,
      locale: typeof body.locale === "string" ? body.locale : "en",
      org, role: str(body.role, 120), company,
      website: str(body.website, 200), message: str(body.message, 1500),
    },
  };
}
```

- [ ] **Step 4: Run, vérifier que ça passe + ajouter script npm**

Run: `node --experimental-strip-types scripts/check-projet-lead.mjs`
Expected: `check-projet-lead OK`.
Modify `package.json` : `"check:projet-lead": "node --experimental-strip-types scripts/check-projet-lead.mjs"` + l'ajouter à `check`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/projet-lead.ts scripts/check-projet-lead.mjs package.json
git commit -m "feat(projet): validation pure du lead + test"
```

---

### Task 5: Email lead (`sendProjetLeadEmail` dans `email.ts`)

**Files:** Modify `src/lib/email.ts` (ajout en fin de fichier)

- [ ] **Step 1: Ajouter la fonction d'envoi**

Append à `src/lib/email.ts` :

```ts
// =============================================================================
// Lead /projet (institutions / sponsors) -> Kami
// =============================================================================
import type { ProjetLead } from "./projet-lead";

const PROJET_LEAD_TO = "contact@kairosguest.com";
const PROJET_LEAD_CC = "hello@crete.direct";

export async function sendProjetLeadEmail(lead: ProjetLead) {
  const who = lead.kind === "institution" ? (lead.org ?? lead.name) : (lead.company ?? lead.name);
  const subject = `[/projet] ${lead.kind} — ${who}`;
  const lines = [
    `Nouveau lead /projet (${lead.kind}).`,
    ``,
    `Nom: ${lead.name}`,
    lead.org ? `Organisme: ${lead.org}` : ``,
    lead.role ? `Fonction: ${lead.role}` : ``,
    lead.company ? `Entreprise: ${lead.company}` : ``,
    lead.website ? `Site: ${lead.website}` : ``,
    `Email: ${lead.email}`,
    `Langue: ${lead.locale}`,
    ``,
    lead.message ? `Message:\n${lead.message}` : `(pas de message)`,
    ``,
    `Repondre au contact : reply direct (reply-to = ${lead.email}).`,
  ].filter((l) => l !== ``);

  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: PROJET_LEAD_TO,
    cc: PROJET_LEAD_CC,
    replyTo: lead.email,
    subject,
    text: lines.join("\n"),
  });
  if (error) throw new Error(`Resend: ${error.message}`);
  return data;
}
```

- [ ] **Step 2: Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: 0 erreur.

- [ ] **Step 3: Commit**

```bash
git add src/lib/email.ts
git commit -m "feat(projet): sendProjetLeadEmail (Resend, relais Kami)"
```

---

### Task 6: API route `/api/projet-lead`

**Files:** Create `src/app/api/projet-lead/route.ts`

- [ ] **Step 1: Implémenter la route**

```ts
import { NextRequest, NextResponse } from "next/server";
import { validateProjetLead } from "@/lib/projet-lead";

// Dedup best-effort en memoire (reset au cold start, suffisant contre le double-clic).
const recent = new Map<string, number>();
const TEN_MIN = 10 * 60 * 1000;

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const v = validateProjetLead(body);
  if (v.kind === "honeypot") return NextResponse.json({ ok: true });
  if (v.kind === "error") return NextResponse.json({ error: v.error }, { status: v.status });
  const { lead } = v;

  const key = `${lead.kind}:${lead.email}`;
  const now = Date.now();
  const last = recent.get(key);
  if (last && now - last < TEN_MIN) return NextResponse.json({ ok: true });
  recent.set(key, now);

  try {
    const { sendProjetLeadEmail } = await import("@/lib/email");
    await sendProjetLeadEmail(lead);
    const hook = process.env.CRETEDIRECT_LEAD_WEBHOOK;
    if (hook) {
      // notif best-effort, ne bloque pas la reponse
      fetch(hook, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(lead) }).catch(() => {});
    }
  } catch (e) {
    console.error("[projet-lead] email error:", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: tsc + commit**

Run: `npx tsc --noEmit` → 0 erreur.

```bash
git add src/app/api/projet-lead/route.ts
git commit -m "feat(projet): API /api/projet-lead (Resend + honeypot + dedup)"
```

---

### Task 7: `AudienceSwitch` (sélecteur de public)

**Files:** Create `src/components/campagne/pro/AudienceSwitch.tsx`

- [ ] **Step 1: Implémenter (Server Component, liens crawlables)**

```tsx
import Link from "next/link";
import { audienceLabels, type ProAudience } from "@/lib/campagne-pro";

const ROUTE: Record<ProAudience, string> = {
  visiteur: "/projet",
  institutions: "/projet/institutions",
  entreprises: "/projet/entreprises",
};
const ORDER: ProAudience[] = ["visiteur", "institutions", "entreprises"];

export default function AudienceSwitch({ locale, active }: { locale: string; active: ProAudience }) {
  const labels = audienceLabels(locale);
  return (
    <nav className="flex justify-center gap-2 px-4 pt-4 pb-1" aria-label="public">
      {ORDER.map((a) => {
        const on = a === active;
        return (
          <Link
            key={a}
            href={`/${locale}${ROUTE[a]}`}
            aria-current={on ? "page" : undefined}
            className={`font-[family-name:var(--font-heading)] text-[13.5px] font-bold rounded-full border-[3px] border-[var(--color-text)] px-[18px] py-2 shadow-[0_4px_0_var(--color-text)] ${
              on ? "bg-lagoon text-white" : "bg-white text-[var(--color-text)]"
            }`}
          >
            {labels[a]}
          </Link>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 2: tsc + commit**

Run: `npx tsc --noEmit` → 0 erreur.

```bash
git add src/components/campagne/pro/AudienceSwitch.tsx
git commit -m "feat(projet): AudienceSwitch (selecteur public)"
```

---

### Task 8: `DataToVision` (frise data → 2028)

**Files:** Create `src/components/campagne/pro/DataToVision.tsx`

- [ ] **Step 1: Implémenter**

```tsx
import type { ProCopy } from "@/lib/campagne-pro";

export default function DataToVision({ frise }: { frise: ProCopy["frise"] }) {
  return (
    <div className="grid w-full max-w-[760px] grid-cols-1 gap-[14px] md:grid-cols-3">
      {frise.steps.map((s) => (
        <div key={s.year} className="rounded-[18px] border-[3px] border-[var(--color-text)] bg-white p-[16px] shadow-[0_6px_0_var(--color-text)]">
          <span className={`mb-[9px] inline-block rounded-full border-2 border-[var(--color-text)] px-[11px] py-[3px] text-[12.5px] font-extrabold text-white ${s.future ? "bg-terra" : "bg-aegean"}`}>
            {s.year}
          </span>
          <h3 className="font-[family-name:var(--font-heading)] text-[15px] font-bold text-[var(--color-text)]">{s.title}</h3>
          <p className="mt-[5px] text-[13px] text-[var(--color-muted,#56707d)]">{s.text}</p>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: tsc + commit**

Run: `npx tsc --noEmit` → 0 erreur. (Si la classe `bg-aegean` n'existe pas en Tailwind, utiliser `bg-[#0B5E78]`. Vérifier dans `globals.css @theme` ; `lagoon`, `terra`, `sun` y sont déjà.)

```bash
git add src/components/campagne/pro/DataToVision.tsx
git commit -m "feat(projet): DataToVision (frise data->2028)"
```

---

### Task 9: `LeadForm` (formulaire client)

**Files:** Create `src/components/campagne/pro/LeadForm.tsx`

- [ ] **Step 1: Implémenter (client, états, honeypot)**

```tsx
"use client";
import { useState } from "react";
import type { ProCopy } from "@/lib/campagne-pro";

type Status = "idle" | "sending" | "sent" | "error";

export default function LeadForm({ locale, form, id }: { locale: string; form: ProCopy["form"]; id?: string }) {
  const [status, setStatus] = useState<Status>("idle");
  const [values, setValues] = useState<Record<string, string>>({});
  const [hp, setHp] = useState("");

  const set = (n: string, v: string) => setValues((s) => ({ ...s, [n]: v }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch("/api/projet-lead", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: form.variant === "institution" ? "institution" : "sponsor", locale, hp, ...values }),
      });
      const data = await res.json();
      setStatus(res.ok && data.ok ? "sent" : "error");
    } catch {
      setStatus("error");
    }
  };

  if (status === "sent") {
    return (
      <div id={id} className="w-full max-w-[560px] rounded-[24px] border-[3px] border-[var(--color-text)] bg-white p-[26px] text-center shadow-[0_7px_0_var(--color-text)]">
        <p className="font-[family-name:var(--font-heading)] text-[20px] font-extrabold text-[var(--color-text)]">{form.sent}</p>
      </div>
    );
  }

  return (
    <form id={id} onSubmit={onSubmit} className="w-full max-w-[560px] rounded-[24px] border-[3px] border-[var(--color-text)] bg-white p-[26px] shadow-[0_7px_0_var(--color-text)]">
      <h2 className="text-center font-[family-name:var(--font-heading)] text-[24px] font-extrabold text-[var(--color-text)]">{form.title}</h2>
      <p className="mb-4 mt-1 text-center text-[14px] text-[var(--color-muted,#56707d)]">{form.lead}</p>
      {/* honeypot cache */}
      <input type="text" name="hp" value={hp} onChange={(e) => setHp(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {form.fields.filter((f) => f.name !== "message").map((f) => (
          <div key={f.name}>
            <label className="mb-[5px] block font-[family-name:var(--font-heading)] text-[12.5px] font-bold text-[var(--color-text)]">{f.label}</label>
            <input
              type={f.type ?? "text"} required={f.required} placeholder={f.placeholder}
              value={values[f.name] ?? ""} onChange={(e) => set(f.name, e.target.value)}
              className="w-full rounded-[13px] border-[2.5px] border-[var(--color-text)] bg-[#F6FBFC] px-[13px] py-[11px] text-[14.5px] text-[var(--color-text)] outline-none focus:border-lagoon"
            />
          </div>
        ))}
      </div>
      {form.fields.filter((f) => f.name === "message").map((f) => (
        <div key={f.name} className="mt-3">
          <label className="mb-[5px] block font-[family-name:var(--font-heading)] text-[12.5px] font-bold text-[var(--color-text)]">{f.label}</label>
          <textarea
            placeholder={f.placeholder} value={values[f.name] ?? ""} onChange={(e) => set(f.name, e.target.value)}
            className="min-h-[84px] w-full resize-y rounded-[13px] border-[2.5px] border-[var(--color-text)] bg-[#F6FBFC] px-[13px] py-[11px] text-[14.5px] text-[var(--color-text)] outline-none focus:border-lagoon"
          />
        </div>
      ))}
      <button type="submit" disabled={status === "sending"} className="mt-4 w-full rounded-full border-[3px] border-[var(--color-text)] bg-lagoon py-[14px] font-[family-name:var(--font-heading)] text-[16px] font-extrabold text-white shadow-[0_5px_0_var(--color-text)] disabled:opacity-60">
        {status === "sending" ? form.sending : form.submit}
      </button>
      {status === "error" && <p className="mt-3 text-center text-[13px] font-semibold text-terra">{form.error}</p>}
    </form>
  );
}
```

- [ ] **Step 2: tsc + commit**

Run: `npx tsc --noEmit` → 0 erreur.

```bash
git add src/components/campagne/pro/LeadForm.tsx
git commit -m "feat(projet): LeadForm (client, honeypot, etats)"
```

---

### Task 10: `SponsorDoors` (les 2 portes entreprise)

**Files:** Create `src/components/campagne/pro/SponsorDoors.tsx`

- [ ] **Step 1: Implémenter**

```tsx
import Link from "next/link";
import type { ProCopy } from "@/lib/campagne-pro";

export default function SponsorDoors({ locale, doors }: { locale: string; doors: NonNullable<ProCopy["doors"]> }) {
  return (
    <div className="grid w-full max-w-[820px] grid-cols-1 gap-[18px] md:grid-cols-2">
      {doors.map((d) => {
        // href interne "/partners" -> prefixe locale ; ancre "#..." inchangee.
        const href = d.href.startsWith("#") ? d.href : `/${locale}${d.href}`;
        const bg = d.id === "sponsor" ? "bg-[#FFF3D6]" : "bg-[#DFF7FA]";
        const ctaBg = d.id === "sponsor" ? "bg-terra text-white" : "bg-white text-[var(--color-text)]";
        return (
          <div key={d.id} className={`rounded-[22px] border-[3px] border-[var(--color-text)] p-[22px] shadow-[0_6px_0_var(--color-text)] ${bg}`}>
            <h3 className="mb-2 font-[family-name:var(--font-heading)] text-[19px] font-extrabold text-[var(--color-text)]">{d.emoji} {d.title}</h3>
            <p className="mb-3 text-[14px] text-[#3f5562]">{d.body}</p>
            <Link href={href} className={`inline-flex items-center gap-2 rounded-full border-[3px] border-[var(--color-text)] px-5 py-[11px] font-[family-name:var(--font-heading)] text-[14.5px] font-extrabold shadow-[0_4px_0_var(--color-text)] ${ctaBg}`}>
              {d.cta}
            </Link>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: tsc + commit**

Run: `npx tsc --noEmit` → 0 erreur.

```bash
git add src/components/campagne/pro/SponsorDoors.tsx
git commit -m "feat(projet): SponsorDoors (2 portes entreprise)"
```

---

### Task 11: `ProParcours` (assemblage de la page pro)

**Files:** Create `src/components/campagne/pro/ProParcours.tsx`

- [ ] **Step 1: Implémenter (réutilise RoadDecor, Card, Reveal, SCENES)**

```tsx
"use client";
import { useReducedMotion } from "motion/react";
import type { ProCopy } from "@/lib/campagne-pro";
import RoadDecor from "../RoadDecor";
import Card from "../Card";
import Reveal from "../Reveal";
import { SCENES } from "../BeatRow";
import DataToVision from "./DataToVision";
import SponsorDoors from "./SponsorDoors";
import LeadForm from "./LeadForm";

const SKY = "linear-gradient(180deg,#90A7B2 0%,#A7C2CC 11%,#BCDCE6 28%,#A8E4EF 46%,#CDEFF6 58%,#E9FAF0 70%,#E7F7EA 85%,#FDF1D6 100%)";

function EmojiBox({ emoji, cap }: { emoji: string; cap?: string }) {
  return (
    <div className="w-[260px] rounded-[20px] border-[3px] border-[var(--color-text)] bg-white p-[18px] text-center shadow-[0_6px_0_var(--color-text)]">
      <div className="text-[56px] leading-none">{emoji}</div>
      {cap && <div className="mt-2 font-[family-name:var(--font-heading)] text-[13px] font-bold text-[var(--color-muted,#56707d)]">{cap}</div>}
    </div>
  );
}

export default function ProParcours({ locale, copy }: { locale: string; copy: ProCopy }) {
  const reduce = useReducedMotion() ?? false;
  return (
    <main className="relative w-full overflow-hidden" style={{ background: SKY }}>
      <RoadDecor />
      <div className="relative z-[3] mx-auto w-full max-w-[1100px]">

        {/* HERO */}
        <section className="flex flex-col items-center gap-[clamp(24px,4vw,34px)] px-[clamp(20px,5vw,60px)] py-[clamp(34px,5vw,46px)] text-center">
          <Reveal reduce={reduce} className="flex w-full justify-center">
            <Card kicker={copy.hero.kicker} kickerVariant={copy.hero.kickerVariant} title={copy.hero.title} sub={copy.hero.sub} size="hero" reduce={reduce} />
          </Reveal>
          {copy.stats.length > 0 && (
            <Reveal reduce={reduce} delay={100} className="grid w-full max-w-[760px] grid-cols-2 gap-[12px] md:grid-cols-4">
              {copy.stats.map((s) => (
                <div key={s.l} className="rounded-[16px] border-[3px] border-[var(--color-text)] bg-white p-[14px] text-center shadow-[0_5px_0_var(--color-text)]">
                  <div className="font-[family-name:var(--font-heading)] text-[22px] font-extrabold text-aegean">{s.n}</div>
                  <div className="mt-1 text-[11px] text-[var(--color-muted,#56707d)]">{s.l}</div>
                </div>
              ))}
            </Reveal>
          )}
        </section>

        {/* BEATS scene + card alternes */}
        {copy.beats.map((b) => {
          const Scene = b.scene ? SCENES[b.scene] : null;
          return (
            <section key={b.id} className="flex w-full items-center justify-center px-[clamp(20px,5vw,60px)] py-[clamp(28px,5vw,42px)]">
              <div className="grid w-full max-w-[1100px] grid-cols-1 items-center gap-[clamp(24px,5vw,50px)] md:grid-cols-2">
                <Reveal reduce={reduce} className={`flex items-center justify-center ${b.flip ? "md:order-2" : "md:order-1"}`}>
                  {Scene ? <Scene /> : <EmojiBox emoji={b.emoji ?? "✨"} cap={b.emojiCap} />}
                </Reveal>
                <Reveal reduce={reduce} delay={100} className={`flex items-center justify-center ${b.flip ? "md:order-1" : "md:order-2"}`}>
                  <Card kicker={b.kicker} kickerVariant={b.kickerVariant} title={b.title} sub={b.body} reduce={reduce} />
                </Reveal>
              </div>
            </section>
          );
        })}

        {/* FRISE data -> 2028 */}
        <section className="flex flex-col items-center gap-[18px] px-[clamp(20px,5vw,60px)] py-[clamp(28px,5vw,42px)] text-center">
          <Reveal reduce={reduce} className="flex w-full justify-center">
            <Card kicker={copy.frise.kicker} kickerVariant="calm" title={copy.frise.title} sub={copy.frise.sub} size="wide" reduce={reduce} />
          </Reveal>
          <Reveal reduce={reduce} delay={100} className="flex w-full justify-center">
            <DataToVision frise={copy.frise} />
          </Reveal>
        </section>

        {/* ASK + dossier (institutions) */}
        {copy.ask && (
          <section className="flex flex-col items-center gap-[18px] px-[clamp(20px,5vw,60px)] py-[clamp(28px,5vw,42px)] text-center">
            <Reveal reduce={reduce} className="flex w-full flex-col items-center gap-3">
              <Card kicker={copy.ask.kicker} kickerVariant="terra" title={copy.ask.title} sub={copy.ask.body} size="wide" reduce={reduce} />
              <a href={copy.ask.dossierHref} className="inline-flex items-center gap-2 rounded-full border-[3px] border-[var(--color-text)] bg-sun px-5 py-[11px] font-[family-name:var(--font-heading)] text-[14.5px] font-extrabold text-[var(--color-text)] shadow-[0_4px_0_var(--color-text)]">
                {copy.ask.dossierLabel}
              </a>
            </Reveal>
          </section>
        )}

        {/* DOORS (entreprises) */}
        {copy.doors && (
          <section className="flex flex-col items-center gap-[18px] px-[clamp(20px,5vw,60px)] py-[clamp(28px,5vw,42px)] text-center">
            <Reveal reduce={reduce} className="flex w-full justify-center">
              <SponsorDoors locale={locale} doors={copy.doors} />
            </Reveal>
          </section>
        )}

        {/* FORMULAIRE */}
        <section className="flex justify-center px-[clamp(20px,5vw,60px)] pb-[80px] pt-[clamp(20px,4vw,34px)]">
          <LeadForm locale={locale} form={copy.form} id="sponsor-form" />
        </section>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: tsc + commit**

Run: `npx tsc --noEmit` → 0 erreur.

```bash
git add src/components/campagne/pro/ProParcours.tsx
git commit -m "feat(projet): ProParcours (assemblage page pro)"
```

---

### Task 12: Route `/projet/institutions`

**Files:** Create `src/app/[locale]/projet/institutions/page.tsx`

- [ ] **Step 1: Implémenter (calqué sur `projet/page.tsx`)**

```tsx
import { setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { buildAlternates } from "@/lib/seo";
import { getInstitutionsCopy } from "@/lib/campagne-pro";
import AudienceSwitch from "@/components/campagne/pro/AudienceSwitch";
import ProParcours from "@/components/campagne/pro/ProParcours";

export const revalidate = 86400;
export const dynamicParams = true;

export function generateStaticParams(): Array<{ locale: string }> {
  return routing.locales.map((locale) => ({ locale }));
}

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { meta } = getInstitutionsCopy(locale);
  return {
    title: meta.title,
    description: meta.description,
    alternates: buildAlternates(locale, "/projet/institutions"),
    openGraph: { title: meta.title, description: meta.description, url: `${BASE_URL}/${locale}/projet/institutions`, type: "website" },
  };
}

export default async function ProjetInstitutionsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const copy = getInstitutionsCopy(locale);
  return (
    <>
      <AudienceSwitch locale={locale} active="institutions" />
      <ProParcours locale={locale} copy={copy} />
    </>
  );
}
```

- [ ] **Step 2: tsc + commit**

Run: `npx tsc --noEmit` → 0 erreur.

```bash
git add "src/app/[locale]/projet/institutions/page.tsx"
git commit -m "feat(projet): route /projet/institutions"
```

---

### Task 13: Route `/projet/entreprises`

**Files:** Create `src/app/[locale]/projet/entreprises/page.tsx`

- [ ] **Step 1: Implémenter**

```tsx
import { setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { buildAlternates } from "@/lib/seo";
import { getEntreprisesCopy } from "@/lib/campagne-pro";
import AudienceSwitch from "@/components/campagne/pro/AudienceSwitch";
import ProParcours from "@/components/campagne/pro/ProParcours";

export const revalidate = 86400;
export const dynamicParams = true;

export function generateStaticParams(): Array<{ locale: string }> {
  return routing.locales.map((locale) => ({ locale }));
}

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { meta } = getEntreprisesCopy(locale);
  return {
    title: meta.title,
    description: meta.description,
    alternates: buildAlternates(locale, "/projet/entreprises"),
    openGraph: { title: meta.title, description: meta.description, url: `${BASE_URL}/${locale}/projet/entreprises`, type: "website" },
  };
}

export default async function ProjetEntreprisesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const copy = getEntreprisesCopy(locale);
  return (
    <>
      <AudienceSwitch locale={locale} active="entreprises" />
      <ProParcours locale={locale} copy={copy} />
    </>
  );
}
```

- [ ] **Step 2: tsc + commit**

Run: `npx tsc --noEmit` → 0 erreur.

```bash
git add "src/app/[locale]/projet/entreprises/page.tsx"
git commit -m "feat(projet): route /projet/entreprises"
```

---

### Task 14: Brancher le sélecteur sur `/projet` (visiteur)

**Files:** Modify `src/app/[locale]/projet/page.tsx`

- [ ] **Step 1: Ajouter `AudienceSwitch` en tête du rendu**

Dans `ProjetPage`, importer `AudienceSwitch` et envelopper le retour :

```tsx
import AudienceSwitch from "@/components/campagne/pro/AudienceSwitch";
// ...
export default async function ProjetPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const copy = getCampagneCopy(locale);
  return (
    <>
      <AudienceSwitch locale={locale} active="visiteur" />
      <ParcoursClient locale={locale} copy={copy} />
    </>
  );
}
```

(Le `AudienceSwitch` a un fond transparent et s'intègre au ciel du parcours ; aucun changement de `ParcoursClient` requis. Les liens « public » suffisent comme renvoi croisé, donc pas de bloc texte supplémentaire en bas.)

- [ ] **Step 2: tsc + commit**

Run: `npx tsc --noEmit` → 0 erreur.

```bash
git add "src/app/[locale]/projet/page.tsx"
git commit -m "feat(projet): selecteur de public sur la page visiteur"
```

---

### Task 15: Sitemap (+2 routes)

**Files:** Modify `src/app/sitemap.xml/route.ts`

- [ ] **Step 1: Ajouter les routes au tableau des pages statiques**

Repérer le tableau qui contient `"/projet"` (vers la ligne 52-55) et ajouter, juste après `"/projet",` :

```ts
  "/projet/institutions",
  "/projet/entreprises",
```

Ces pages passent dans la boucle `push(page, ...)` existante (priorité 0.8, changefreq weekly), avec hreflang via le mécanisme du sitemap pour les 22 locales.

- [ ] **Step 2: Vérifier que les URLs sortent**

Run: `node --experimental-strip-types -e "import('./src/app/sitemap.xml/route.ts')" 2>&1 | head -3` (si non importable hors Next, sauter et vérifier au build Task 17).
Sinon vérifier visuellement la présence des deux chaînes.

- [ ] **Step 3: Commit**

```bash
git add src/app/sitemap.xml/route.ts
git commit -m "feat(projet): sitemap +/projet/institutions +/projet/entreprises"
```

---

### Task 16: Dossier PDF (institution)

**Files:**
- Create: `public/dossiers/crete-direct-institutions-fr.pdf`
- Create: `public/dossiers/crete-direct-institutions-en.pdf`
- Create: `scripts/gen-dossier-pdf.mjs`

- [ ] **Step 1: Script de génération (one-off, depuis le one-pager autorités)**

Create `scripts/gen-dossier-pdf.mjs` :

```js
// Genere les PDF du dossier institutions depuis le one-pager autorites valide.
// Lance avec le chromium de crete-direct-instagram (cf project_crete_direct_campagne).
import { chromium } from "playwright";
import path from "node:path";

const SRC = "C:/Users/fkerj/Desktop/crete-direct-onepager-autorites.html";
const OUT = "public/dossiers";
const b = await chromium.launch();
const p = await b.newPage();
await p.goto("file://" + SRC, { waitUntil: "networkidle" });
// langue FR : la page a un toggle FR/EN/EL ; on force FR puis on imprime, puis EN.
await p.evaluate(() => window.setLang && window.setLang("fr"));
await p.pdf({ path: path.join(OUT, "crete-direct-institutions-fr.pdf"), format: "A4", printBackground: true });
await p.evaluate(() => window.setLang && window.setLang("en"));
await p.pdf({ path: path.join(OUT, "crete-direct-institutions-en.pdf"), format: "A4", printBackground: true });
await b.close();
console.log("dossiers PDF generes");
```

- [ ] **Step 2: Générer les PDF**

```bash
mkdir -p public/dossiers
cd /c/Users/fkerj/crete-direct-instagram && node /c/Users/fkerj/cretepulse-projet-publics/scripts/gen-dossier-pdf.mjs
```

(Adapter le cwd pour résoudre le `playwright` installé ; sortie écrite via chemin relatif `public/dossiers` -> exécuter depuis le worktree, ou mettre des chemins absolus dans `OUT`.)
Expected: 2 PDF créés, > 20 Ko chacun.

- [ ] **Step 3: Commit (les PDF + le script)**

```bash
git add scripts/gen-dossier-pdf.mjs "public/dossiers/crete-direct-institutions-fr.pdf" "public/dossiers/crete-direct-institutions-en.pdf"
git commit -m "feat(projet): dossier PDF institutions FR/EN"
```

---

### Task 17: Vérification finale (gates + Playwright + build)

**Files:** Create `scripts/check-projet-pages.mjs` (Playwright preview), aucun fichier prod.

- [ ] **Step 1: Gates statiques**

Run:
```bash
npx tsc --noEmit
node --experimental-strip-types scripts/check-projet-copy.mjs
node --experimental-strip-types scripts/check-projet-lead.mjs
```
Expected: tsc 0, `check-projet-copy OK`, `check-projet-lead OK`.

- [ ] **Step 2: Build**

Run: `SUPABASE_SERVICE_KEY=dummy npm run build`
Expected: EXIT 0. Les routes `/[locale]/projet/institutions` et `/[locale]/projet/entreprises` apparaissent comme générées (en, fr prerendered, autres en ISR fallback).

- [ ] **Step 3: Lancer le dev server + Playwright sur les 3 routes**

Create `scripts/check-projet-pages.mjs` :

```js
import { chromium } from "playwright";
const BASE = process.env.BASE || "http://localhost:3000";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 1000 } });
let fails = 0;
for (const url of ["/fr/projet", "/en/projet", "/fr/projet/institutions", "/en/projet/institutions", "/fr/projet/entreprises", "/en/projet/entreprises"]) {
  const r = await p.goto(BASE + url, { waitUntil: "networkidle" });
  const ok = r && r.status() === 200;
  const hasSwitch = await p.locator("nav[aria-label='public'] a").count();
  if (!ok || hasSwitch < 3) { console.error("FAIL", url, r && r.status(), "switch=", hasSwitch); fails++; }
  else console.log("OK", url);
}
// formulaire present sur institutions
await p.goto(BASE + "/fr/projet/institutions", { waitUntil: "networkidle" });
const hasForm = await p.locator("form button[type=submit]").count();
if (hasForm < 1) { console.error("FAIL form institutions"); fails++; }
await b.close();
process.exit(fails ? 1 : 0);
```

Run (dans le worktree, après `SUPABASE_SERVICE_KEY=dummy npm run dev` sur un port libre) :
```bash
cd /c/Users/fkerj/crete-direct-instagram && BASE=http://localhost:3000 node /c/Users/fkerj/cretepulse-projet-publics/scripts/check-projet-pages.mjs
```
Expected: 6 `OK` + form OK, exit 0.

- [ ] **Step 4: Captures pour validation Kami (mockup-avant-deploy)**

Reprendre le script de capture (`shot-projet.mjs`) sur `localhost` pour `/fr/projet/institutions` + `/fr/projet/entreprises` → PNG envoyés à Kami. NE PAS merger `master:main` sans son GO (cf [[feedback_mockup_avant_deploy]]).

- [ ] **Step 5: Commit final + push preview**

```bash
git add scripts/check-projet-pages.mjs
git commit -m "test(projet): check Playwright 3 routes + form"
git push -u origin feat/projet-publics
```
Vercel génère une URL preview (`feat/projet-publics`) à valider hors prod. Déploiement prod = `git push origin feat/projet-publics:master` puis `master:main`, UNIQUEMENT sur GO Kami.

---

## Self-review (couverture spec)

- 3 routes + sélecteur → Tasks 7, 12, 13, 14.
- Re-toning par public, DA parcours réutilisée → Tasks 11 (ProParcours réutilise RoadDecor/Card/Reveal/SCENES), 2, 3.
- Asks Institution (partenariat + co-financement + dossier PDF) → Tasks 2 (ask), 16 (PDF).
- Asks Entreprise E3 (sponsor sans grille + Être visible→/partners) → Tasks 3 (doors), 10.
- Formulaires intégrés via /api/projet-lead (Resend, honeypot, dédup, webhook opt, pas de DB) → Tasks 4, 5, 6, 9.
- FR + EN, fallback EN → Tasks 2, 3 + getters Task 1.
- Bloc data→2028 commun → Task 8 + frise dans chaque copy.
- SEO (metadata ciblées, alternates, sitemap +2) → Tasks 12, 13, 15.
- Hors scope V2 (EL, grille paliers, table DB, RDV, Stripe) → non implémentés, conforme.

Pas de placeholder, signatures de types cohérentes (`ProCopy`/`ProjetLead`/`validateProjetLead`/`sendProjetLeadEmail` identiques entre tasks).
