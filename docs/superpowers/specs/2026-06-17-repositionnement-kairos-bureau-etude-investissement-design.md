# Repositionnement Kairos : « bureau d'étude et investissement »

Date : 2026-06-17 · Statut : **à valider par Kami avant writing-plans**
Périmètre : 2 repos (crete.direct = `cretepulse-build` ; kairosguest.com = `siteweb`).

## 1. Décision de positionnement (validée 17/06)

Kairos n'est plus « gestion locative ». Cœur de métier public = **bureau d'étude et investissement**, **2 piliers à parité** :
1. **Investissement immobilier** : étude de rentabilité/marché + accompagnement à l'achat en Crète.
2. **Fiscalité franco-grecque** : conseil fiscal + accompagnement annuel (certifié AMF, démarche ORIAS CIF en cours).

**Gestion locative** : retirée du discours public, **maintenue best-effort / sur demande** pour les clients accompagnés. Jamais supprimée du service, juste sortie de la mise en avant.

Cohérence avec le pivot mémoire du 02/06 (`project_kairos_consulting_fiscal.md`) : c'est l'accélération de la décision E (« pivot plus marqué ») — le hero/nav kairosguest étaient déjà majoritairement alignés.

## 2. Insight d'audience (fonde tout le lot A)

- **crete.direct attire des touristes** (préparation de voyage), pas des investisseurs FR.
- Le CTA **voyageur** (`RentalCTA` → réservation de séjours) est aligné avec cette audience → **conservé**.
- Le CTA **gestion locative** (propriétaires) était déjà mal ciblé → **retiré**.
- Un CTA **investissement** n'est pertinent que là où l'intention existe : les pages **données** (`/airbnb/[zone]` : prix/revenus/occupation ; `/airport` : trafic). C'est là, et seulement là, qu'on le place.

## 3. Lot A — crete.direct (`C:\Users\fkerj\cretepulse-build`)

### A1. Retirer la gestion locative
- Supprimer `AffiliateCTA type="propertyManagement"` de : `beaches/[slug]/page.tsx`, `where-to-stay/[area]/page.tsx`, `villages/[slug]/page.tsx`.
- `affiliates.ts` : retirer la clé `propertyManagement` (plus aucun consommateur après ce lot).
- `Footer.tsx` : retirer le lien property management.
- `messages/*.json` (22 langues) : identifier par grep les clés liées à property-management (label CTA + entrée footer) et les retirer. Si une clé sert ailleurs, la conserver ; sinon suppression.
- Page `/property-management` : **gardée mais déliée** → retirer du nav/footer + `sitemap.xml/route.ts` + ajouter `robots: noindex`. Page orpheline conservée (pas de suppression, pas de redirect).

### A2. Ajouter le CTA investissement (ciblé data)
- Nouveau composant `InvestmentCTA` (calqué sur `RentalCTA` : discret, UTM-tracké, 4 langues UI en/fr/de/el + fallback en, `targetLocale` fr/en vers kairosguest). **Lien dofollow** : `rel="noopener"` (PAS `nofollow`/`sponsored`) — site maison, transmission d'autorité voulue (cf B6).
- Cible du lien : `https://kairosguest.com/{fr|en}/acheter-en-crete?utm_source=crete-direct&utm_medium=cta&utm_campaign=investment&utm_content=...`
- Placement : `airbnb/page.tsx` (index), `airbnb/[neighbourhood]/page.tsx`, `airport/page.tsx` (index), `airport/[slug]/page.tsx`.
- Wording proposé (FR) : titre « Investir dans la location courte durée en Crète ? » · corps « Kairos, bureau d'étude et investissement : analyse de rentabilité par zone, accompagnement à l'achat, fiscalité franco-grecque. En français, certifié AMF. » · CTA « Étudier mon projet ». (EN/DE/EL à produire, fallback EN.)

### A3. Conserver intact
- `RentalCTA` (voyageur) sur articles, beaches, where-to-stay, things-to-do, compare.
- Moteur de réservation directe / booking.

## 4. Lot B — kairosguest.com (`C:\Users\fkerj\siteweb`)

Constat : hero (`messages/*.json` `hero.*`) + nav (menus Consulting/Invest) + pages piliers (`/conseil-fiscal-grece`, `/accompagnement-annuel`, `/acheter-en-crete`) **déjà en place**. Travail = retrait du résiduel.

### B1. Nav (`components/Navbar.tsx`)
- Retirer le lien standalone « Gestion locative » (`nav.rental` → `/gestion-locative`, ~ligne 128).

### B2. Home — carte service (`components/ServiceCards.tsx` + `messages` `services.card2*`)
- Reformuler card 2 « Gestion locative & conciergerie » → **« Gestion déléguée sur demande »**, desc orientée clients existants, **placée en bas de liste** (après les 2 piliers). Ne pas supprimer la carte.

### B3. Page `/gestion-locative` — garder + réorienter
- Retirer du nav/CTA (déjà couvert B1) ; conserver l'URL (SEO + clients existants).
- Ajouter en tête un **bandeau de réorientation** : « Kairos se concentre désormais sur le conseil à l'investissement et la fiscalité franco-grecque. La gestion locative reste assurée sur demande pour nos clients accompagnés. → Découvrir notre accompagnement » (lien `/accompagnement-annuel`).

### B4. Nettoyage des mentions résiduelles (`messages/fr.json` + `en.json`)
- `footer.taglineDetail` : « Investissement immobilier & gestion locative » → « Investissement immobilier & conseil » (FR) / « Real estate investment & advisory » (EN).
- `faq.q8` (commission gestion locative) : conservée en place, reformulée en « gestion déléguée sur demande » (cohérent avec la carte service B2).
- `blog.subtitle` : retirer « gestion locative » de l'énumération.
- `dpa.purposeContent` : conserver la base légale mais retirer la mise en avant.
- CTA `rental` : `CTASection.tsx` (variant rental), `rental-analyzer/KairosCTA.tsx`, `Process.tsx`, `CrossLinks.tsx` → réorienter vers les piliers (investissement / accompagnement) plutôt que gestion.

### B5. Backlink kairosguest → crete.direct (nouveau, demande Kami 17/06)
Aujourd'hui le lien n'existe que dans le sens crete.direct → kairosguest. On ajoute le retour, en **dofollow** (deux sites maison : pas de `nofollow`/`sponsored` ; `target="_blank" rel="noopener"` = sécurité, neutre SEO).
- **Footer** (`components/Footer.tsx`, sitewide) : lien écosystème « Crete Direct — le guide pratique de la Crète » → `https://crete.direct`.
- **Mention contextuelle** (dofollow, plus fort qu'un lien footer) dans `/developpement-crete` (page marché) : citer crete.direct comme **source de données de marché** (prix Airbnb, occupation, trafic aéroport par zone). Double bénéfice : autorité SEO transmise à crete.direct + renforce l'E-E-A-T et le positionnement « étude appuyée sur les données » de Kairos.
- Wording proposé (FR) : « Nos analyses s'appuient sur les données de marché publiées en continu sur [crete.direct](https://crete.direct). »

### B6. (Optionnel, sens inverse) dé-nofollow du CTA crete.direct → kairosguest
Le CTA `propertyManagement` actuel est `rel="nofollow sponsored"` (jette du jus entre sites maison, cf audit backlinks 17/06). Comme ce CTA est retiré au Lot A et remplacé par `InvestmentCTA`, **le nouvel `InvestmentCTA` sera en dofollow** (`rel="noopener"`, pas de nofollow/sponsored) — site maison, transmission d'autorité voulue. À noter dans le Lot A.

### B7. Conserver intact
- Hero, pages piliers, `/voyager-en-crete/*` (booking voyageur), `/rental-analyzer`, `/biens`, `/developpement-crete` (structure ; on y ajoute juste la mention B5).

## 5. Ordre d'implémentation
1. **Lot B d'abord** (le message source) puis **Lot A** (qui pointe vers kairosguest). Le wording des piliers est figé en B, réutilisé en A.
2. Chaque lot = 1 worktree `feat/` dédié, `tsc` vert, preview Vercel, validation Kami (ouverture des pages), merge prod.

## 6. Vérification
- crete.direct : `propertyManagement` absent des 3 pages + footer ; `/property-management` en `noindex` + hors sitemap ; `InvestmentCTA` présent sur /airbnb + /airport (curl UA navigateur, grep) ; `RentalCTA` voyageur intact.
- kairosguest : « Gestion locative » absent du nav ; bandeau présent sur `/gestion-locative` ; footer tagline mis à jour ; `tsc`/build vert.

## 7. Hors périmètre (YAGNI)
- Pas de refonte structurelle ni visuelle de kairosguest.
- Pas de nouvelles pages services (les piliers existent).
- Pas de modification du booking voyageur ni du rental-analyzer.
- Pas de production des 22 langues du CTA investissement crete.direct : 4 langues UI (en/fr/de/el) + fallback EN, comme les composants existants.
