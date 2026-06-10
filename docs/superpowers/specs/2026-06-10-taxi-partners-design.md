# Design — Produit « partenaire taxi » (comparatif bus vs taxi + slot sponsorisé + /partners + rapport Plausible)

Date : 10/06/2026 (brainstorming exécuté en session autonome sur cadrage validé Kami/Hélène le 10/06,
cf `docs/marketing/2026-06-10-plan-compagnon-pratique.md` + mémoire `project_crete_direct.md` Phase 8).
Butoir : en prod + 1er email outreach avant le **30/06/2026** (sinon report avril 2027).

## Objectif

Monétiser l'asset bus (~74 % du trafic, 85 pages paires `/buses/[pair]` fraîchement déployées) en
vendant en direct aux opérateurs de taxi locaux un slot sponsorisé exclusif par zone, avec :
1. un bloc **comparatif bus vs taxi** utile au lecteur (tarifs officiels au compteur, publiables),
2. un **slot partenaire** étiqueté « sponsorisé » sur les pages bus de sa zone,
3. une page **/partners** publique avec grille des zones et paiement Stripe sans rendez-vous,
4. une **preuve de valeur** : rapport Plausible mensuel automatique (clics tel:, pages vues).

Contraintes invariantes : 100 % automatique après construction (zéro ops récurrent Kami, vente par
email uniquement), étiquette « sponsorisé » visible, aucune invention de données (méthodologie
affichée), bascule honnête du « No ads (yet) » au premier signé.

## Décisions de cadrage héritées (déjà validées, non rediscutées)

- Comparatif sur `/buses` (planificateur) ET les 85 pages `/buses/[pair]`.
- Vente directe récurrente mensuelle, machine outreach NovAI, emails validés un par un par Kami.
- **Hypothèse prix : 49 €/mois/zone exclusive — À TRANCHER par Kami à la revue de la page** (seul
  point ouvert ; la page part avec 49 €, modifiable en 1 commit + 1 update Stripe).

## Approches considérées

### Source des prix taxi
- **A. Estimation au compteur réglementé (retenue)** : lib TS pure, coordonnées par slug de lieu
  (~75 lieux est+ouest), distance haversine × `ROAD_FACTOR` calibré (~1.4, routes crétoises
  sinueuses), tarif réglementé grec hors agglomération (« tarif 2 » ≈ 1,25 €/km + prise en charge),
  fourchette ±10 %, plancher 10 €. Couvre automatiquement les 85 paires et toute paire future,
  honnête (méthodo affichée « estimation au compteur, tarif officiel »), pur et testable, cohérent
  avec les fourchettes déjà publiées sur `/getting-around` (Heraklion–Chania ≈ 150-180 €).
- B. Grille curée des 85 paires : précision marginale, gros coût de curation + maintenance. Rejetée.
- C. Table DB : sur-engineering pour une donnée dérivable. Rejetée.

### Données partenaires
- **A. JSON unique versionné (retenue)** : `src/data/taxi-partners.json`, importé par le front
  (resolveJsonModule) ET lu par le script VPS de rapport (copié au déploiement, pattern `vps/*.py`
  existant). Un signup = 1 édition JSON + push (deploy auto). Volume attendu : unités.
- B. Table Postgres VPS : ajoute de l'infra et un chemin d'écriture pour ~5 lignes/an. Rejetée.

### Page /partners et paiement
- **A. Un Stripe Payment Link unique 49 €/mois + custom field « zone » obligatoire (retenue)** :
  zéro code de checkout, créé via MCP Stripe (compte Kairos SASU), URL en constante. La zone
  exclusive est vérifiée manuellement à réception (email Stripe → Kami répond, le JSON fait foi).
- B. Stripe Checkout intégré + webhook : sur-engineering pour un produit à validation humaine
  (exclusivité de zone = contrôle manuel de toute façon). Rejetée.

## Architecture

### 1. `src/lib/taxi-fare.ts` (pur, zéro I/O)
- `PLACE_SLUG_COORDS: Record<string, [lat, lng]>` : coordonnées des ~75 slugs de `BUS_PLACE_SLUGS`
  (source : PLACE_COORDS du scraper Python pour l'est, curation OSM/Wikipédia pour l'ouest).
- `TAXI_TARIFF = { pickup: 1.80, perKm: 1.25, minFare: 10, roadFactor: 1.4 }` — tarif réglementé
  grec 2026 hors agglomération, facteur route calibré par test sur ≥5 distances routières connues.
- `taxiFareRange(slugA, slugB): { low, high, km } | null` : fourchette arrondie aux 5 €
  (±10 % autour de l'estimation), null si coordonnée manquante (le bloc ne s'affiche pas).
- Testée par `scripts/check-taxi-fare.mjs` (node type-stripping, pattern `check-bus-journey.mjs`) :
  calibration, symétrie, couverture (chaque slug de BUS_PLACE_SLUGS a des coords), plancher.

### 2. `src/lib/taxi-partners.ts` + `src/data/taxi-partners.json`
- JSON : `{ zones: [{ id, label, placeSlugs: [...] }], partners: [{ zoneId, name, phone, website?,
  reportEmail, since }] }`. Au lancement : zones définies (heraklion, lasithi-nord, ierapetra-sud-est,
  sitia, chania, rethymno, ouest-sud), `partners: []`.
- Lib : `zoneOfSlug(slug)`, `partnerForPair(slugA, slugB)` (priorité zone de A, sinon zone de B),
  `activePartners()`. Chaque slug de BUS_PLACE_SLUGS appartient à exactement une zone (testé).

### 3. UI — `src/components/TaxiCompare.tsx` (+ `TaxiCallButton.tsx` client)
Bloc rendu sur chaque page paire (sous les deux DirectionSection) et, en version compacte, dans
chaque `JourneyCard` du planificateur (le calcul est pur → importable client) :
- **Toujours** : « En taxi : ~X–Y € · Z km » vs prix bus de la page, mention « estimation au
  compteur, tarif officiel » (lien méthodo dans le disclaimer existant).
- **Avec partenaire de zone** : badge `Sponsored / Sponsorisé / Gesponsert / Χορηγία` + nom +
  bouton tel: (`TaxiCallButton`, client : `window.plausible('Taxi Call', { props: { zone, pair,
  partner } })` au clic) + lien site éventuel (outbound déjà auto-tracké).
- **Sans partenaire** : une ligne inbound discrète « Vous exploitez un taxi dans la région ? →
  /partners » (4 langues).
- 4 langues inline en/fr/de/el, fallback EN (pattern T de la page paire).

### 4. Intégration pages paires
- Bloc TaxiCompare + **FAQ AEO supplémentaire** quand `taxiFareRange` existe : « How much is a
  taxi from A to B? » → « Around X–Y € at the official meter rate; the KTEL bus costs P €. »
  (4 langues, injectée dans le FAQPage JSON-LD existant — candidat citation ChatGPT/Perplexity).

### 5. Page `/[locale]/partners/page.tsx`
- Server component, 4 langues complètes (en/fr/de/el — cible = opérateurs grecs, EN/EL d'abord),
  fallback EN, `buildAlternates`, sitemap +1, indexable.
- Contenu : pitch chiffré honnête (74 % du trafic sur /buses, 7+ langues, source Plausible public),
  ce que comprend le slot (exclusivité de zone, étiquette sponsorisé, rapport mensuel), grille des
  zones avec statut disponible/pris (dérivé du JSON), prix 49 €/mois (constante unique), CTA
  Stripe Payment Link + mailto contact@kairosguest.com, FAQ B2B (résiliation libre, comment c'est
  mesuré, pourquoi étiqueté sponsorisé).
- Stripe : produit « Crete Direct — Taxi partner slot (exclusive zone) », prix 49 €/mois récurrent,
  Payment Link avec custom field obligatoire « Taxi zone » — créés via MCP Stripe ; si indisponible
  en session, URL placeholder en env `NEXT_PUBLIC_PARTNERS_STRIPE_URL` + tâche Kami.

### 6. Rapport mensuel — `vps/partner_report.py`
- Cron VPS le 1er du mois 08:00 Athens. Lit `taxi-partners.json` (copié sur le VPS au déploiement).
  Zéro partenaire → exit 0 silencieux.
- Par partenaire : Plausible Stats API self-hosted (`analytics.crete.direct`, clé `PLAUSIBLE_API_KEY`
  à générer dans l'admin) → events `Taxi Call` filtrés `props.zone`, pages vues des pages paires de
  la zone, mois écoulé. Email EN sobre via Resend (`RESEND_API_KEY` sur le VPS) au `reportEmail`,
  copie contact@kairosguest.com. Dry-run testable (`--dry-run` imprime l'email sans envoyer).
- Pytest dans `scripts/scrapers/buses` non applicable → tests dédiés `vps/test_partner_report.py`
  si logique non triviale, sinon dry-run documenté.

### 7. Runbook signature — `docs/runbooks/taxi-partner-signup.md`
Étapes au 1er signé (et suivants) : vérifier paiement Stripe, ajouter l'entrée `partners` au JSON,
**basculer les textes « No ads (yet) » / « No ads »** (`messages/en.json` footer.about + about page
+ llms.txt) vers « Clearly-labelled local sponsors », push, vérifier le slot en prod, répondre au
partenaire avec la date du premier rapport.

## Flux de données

Pages paires (SSR/ISR 24h) : `BUS_PLACE_SLUGS` → slugs → `taxiFareRange` + `partnerForPair` →
bloc + FAQ. Planificateur (client) : mêmes libs pures, calcul local. Clic tel: → event Plausible →
ClickHouse → Stats API → rapport mensuel → email Resend. Signup : Payment Link → email Stripe →
Kami édite le JSON → push → deploy → slot live.

## Gestion d'erreurs

- Coords manquantes → pas de bloc taxi (jamais de prix inventé).
- Prix bus absent (tarif au guichet) → le bloc affiche le taxi seul, sans comparaison.
- Plausible API down au cron → retry simple puis email d'alerte à contact@ (pas de silence).
- Deux partenaires candidats (zone A et zone B) → un seul slot, zone de A prioritaire (déterministe).

## Tests

- `scripts/check-taxi-fare.mjs` : calibration ROAD_FACTOR (≥5 paires aux distances routières
  connues, tolérance ±15 %), couverture coords = 100 % des slugs, fourchettes symétriques, plancher.
- `scripts/check-taxi-partners.mjs` : chaque slug a exactement une zone ; schéma JSON valide ;
  `partnerForPair` déterministe.
- Vérif visuelle Playwright dev (page paire avec/sans partenaire fictif, /partners 4 langues) puis
  curl prod post-deploy. Zombies dev server : tuer les listeners port 3000 après chaque run.

## Hors scope (YAGNI)

- Réservation de course en ligne, multi-partenaires par zone, enchères, dashboard partenaire,
  facturation automatisée au-delà de Stripe, intégration getting-around (8 pages, déjà servies).
