# Spec v2 — SEO bus : architecture canonique « X to Y bus » + indexation des pages-trajet

Date : 2026-06-15
Statut : **VALIDÉ Kami** (architecture « buses proprio unique » + élagage AGRESSIF ~40 pairs) + 2 self-reviews adversariales intégrées. §11 : point 1 tranché (élagage agressif), points 2-6 = calls Claude actés. PRÊT pour `superpowers:writing-plans`, **GATED : après merge `feat/bus-network`** (collision `bus-pairs.ts`).
Repo : `cretepulse-build` (crete.direct)
Branche cible impl : `feat/seo-buses` (worktree dédié) — **à séquencer APRÈS le merge de `feat/bus-network`** (refactor actif de `bus-pairs.ts`).
Owner : Claude (P0 + P1) / Kami (P2 backlinks)

## 0. État réel vérifié (GSC + code, 15/06 — corrige le diagnostic v1)

[FACT 2026-06-15 source: GSC URL Inspection + searchAnalytics sc-domain:crete.direct + sitemap public + audit code]

- Le sitemap public émet **89 pages-trajet** `/buses/<slug>` (pas 393 ; les 393 « routes » de l'UI incluent les 2 sens et des lieux non éligibles).
- **Les vrais slugs sont alphabétiques** (`pairSlug()` `bus-pairs.ts:102`) : `chania-to-heraklion`, pas `heraklion-to-chania`. La v1 avait inspecté un slug inexistant (404) d'où un faux « unknown ».
- État d'indexation réel des vrais slugs :
  - `agios-nikolaos-to-heraklion`, `heraklion-to-malia` = **« Discovered – currently not indexed »** (déclarés dans le sitemap).
  - `chania-to-heraklion` = « unknown » ET absent du sitemap (le trajet majeur manque → bug `eligiblePairs` à investiguer).
- **0 impression** sur toutes les pages-trajet (28j, robuste).

**Conséquence sur le diagnostic** : le blocage n'est pas la découverte (Google connaît les pages) mais **la décision d'indexation** : Google déprioritise 89 pages-template minces near-duplicate sur un domaine jeune. Le levier n'est donc PAS « soumettre » (sitemap/IndexNow déjà faits) mais **« mériter l'index »** : élaguer le mince, concentrer le maillage interne depuis des pages indexées, contenu unique. C'est plus lent et plus qualitatif que la v1 ne le disait.

## 1. Contexte chiffré (GSC réel, 28j 17/05-13/06/2026)

- Site : 1586 clics / 57 730 impr / pos 14,1 ; +153 % clics vs 28j (627), pos 20,3 -> 14,1. Momentum fort.
- Tête de requête : `crete bus` pos **26**, `bus crete` pos **32** (page 3-4). C'est `/en/buses` qui ranke. Top 3 = jeu d'autorité 6-18 mois (hors scope, = P2).
- Gisement immédiat (pos 5-20), surtout NON-EN + KTEL : `/fr/buses` pos 8 « ktel bus horaires » ; `/fi` `/nl` `/de` pos 8-9 « bus crete » (page 1 dans leur langue) ; long-tails KTEL « official timetable » pos 6-11.
- Cannibalisation (audit) : `buses/[pair]` (DB, scalable, non indexé) vs `getting-around/[route]` (8 statiques, noindex 15/05, section bus doublon, recouvre 4 trajets) vs `compare/[slug]` (zéro contenu bus mais pos 2,8-3 sur « X to Y bus »).
- `sitemap-news.xml` = 432 erreurs (signal de confiance crawl négatif au niveau propriété — remonté en P1, cf §4.14).

## 2. Décision d'architecture (validée Kami = « buses = proprio unique full ») — INCHANGÉE

`buses/[pair]` = **seul propriétaire canonique de l'intention « X to Y bus »**. Asset scalable (DB), frais (scraper), mono-intention.
1. `buses/[pair]` = seul canonique « X to Y bus / timetable / ktel X Y ».
2. 301 redirect des 4 `getting-around` en doublon -> `buses/[pair]` — **MAIS après indexation de la cible (cf §4.2, ordre inversé)**.
3. Couper le maillage `buses -> getting-around` (noindex).
4. `compare` : encart-lien vers `buses/[pair]` (ancre NEUTRE, sans densifier « bus » sur compare).
5. Le levier réel = mériter l'index (qualité + maillage + élagage), pas juste soumettre.

## 3. Objectifs / non-objectifs

### Objectifs
- Faire passer les pairs DIGNES de « Discovered – not indexed » à **Indexed + 1re impression** (Gate A, cf §9).
- Pousser `/en/buses` (et surtout les `/buses` non-EN pos 8-9) sur le striking-distance.
- Une seule page canonique par intention de trajet.

### Non-objectifs (YAGNI)
- Pas de course à la tête « crete bus » par l'on-page (= P2 backlinks, owner Kami).
- Pas de schema transit comme « rich snippet » : **Google ne rend AUCUN rich result `Trip`/`BusTrip`** (galerie Search Central vérifiée). Abandonné (cf §4.11).
- Pas de refonte scraper/`bus_routes`.

### Règle anti-cannibalisation (invariante)
- « X to Y **bus** » -> `buses/[pair]` (title/H1/meta portent « bus »).
- « X to Y » multimodal (aéroport, ferry) -> `getting-around/[route]` (sans dupliquer la donnée bus live).
- « X **vs** Y » (choix de destination) -> `compare/[slug]` (zéro token transport ; lie vers le pair quand il existe, ancre neutre).

## 4. Changements

### P0 — Mériter l'index (le vrai levier, corrigé v1)

- **4.0 Étape préalable obligatoire.** Investiguer pourquoi `chania-to-heraklion` (trajet majeur) est absent de `eligiblePairs`/sitemap. Lister l'état GSC des 89 slugs réels (échantillon) pour distinguer « Discovered – not indexed » (majorité, = qualité) de « Crawled – not indexed » (= duplication) de « unknown » (= sitemap/lien). Le remède diffère par état.
- **4.1 Élaguer le near-duplicate (anti-bloat) = action #1.** `eligiblePairs` (`bus-pairs.ts`) ou un filtre sitemap : **noindex + retrait sitemap** des pairs sans horaires publiés (`departures.length===0` les deux sens) et sans demande (aucune impression GSC, lieux mineurs). Objectif : passer de 89 pairs indexables à un sous-ensemble **qualité** (~30-45) avec horaires réels. Logguer ce qui est exclu (pas de cap silencieux). C'est ce qui débloque « Discovered -> Indexed » : Google indexe des pages denses, pas 89 templates quasi-vides.
- **4.2 Sitemap : lastmod per-route HONNÊTE.** `sitemap.xml/route.ts:191` : le `select("from_place,to_place")` n'inclut pas `scraped_at` et `eligiblePairs` ne porte pas de date -> modifier la requête (add `scraped_at`) + grouper par paire (réutiliser `latestScrapedAt()` `buses.ts:68`). N'avancer `lastmod` **que si le contenu rendu change** (hash des horaires), pas à chaque run du scraper (sinon faux signal de fraîcheur).
- **4.3 Maillage interne entrant vers les pairs DIGNES.** Depuis les pages déjà indexées : `things-to-do/[city]`, `where-to-stay/[area]`, `/beaches/[slug]`, `/explore`. **+ rendre les rangées `DepBoard` de l'accueil cliquables -> `/buses/[pair]`** : ce chantier est specّé par un autre terminal (`2026-06-15-home-depboard-clickable-rows-design.md`) mais **PAS encore codé** -> à intégrer ici OU séquencer explicitement (NE PAS supposer que c'est déjà fait). Le maillage depuis la home (page la plus crawlée) est le signal d'autorité interne #1 pour faire indexer les pairs.
- **4.4 getting-around recentré aéroport/ferry.** Retirer les 4 trajets inter-villes (`heraklion-to-{chania,rethymno,agios-nikolaos,sitia}`) de `ROUTES`, **et du `RELATED{}`** (`getting-around/[route]/page.tsx:127-136`, sinon liens internes morts/301), **et du set `GETTING_AROUND`** (`buses/[pair]/page.tsx:146-149`) + couper le `Link` ligne 366 (sinon `buses` indexé -> 301 interne). NB ce `Set.has(pair)` ne matche déjà jamais (slug alpha vs slug heraklion-first) -> lien probablement déjà mort. Garder/ré-indexer le sous-ensemble aéroport/ferry (4 routes, pos 9-11, vraie intention « airport bus » non couverte par les pairs).
- **4.5 Redirects 301 — APRÈS indexation (ordre inversé vs v1).** Poser les 301 `getting-around/{4 slugs}` -> `buses/<même slug>` **seulement une fois les cibles indexées** (vérifié GSC). Avant ça, laisser getting-around en `noindex, follow` (le `follow` passe déjà le jus, sans détruire les impressions résiduelles pos 9-11). Mécanisme : étendre le `redirects()` existant de `next.config.ts:29` (déjà utilisé pour `/go/:code`, s'exécute avant le middleware next-intl) avec un pattern `/:locale/getting-around/<slug>` (accepter que `:locale` ne soit pas borné aux 22, la cible 404 proprement) ; `permanent:true`. Vérifier hreflang (§6) avant.
- **4.6 Encart bus sur `compare` (ancre neutre).** `compare/[slug]/page.tsx` : quand la paire bus existe, bloc « Se déplacer entre X et Y » -> `buses/[pair]`. Mapping : `pairSlug(comp.a, comp.b)` PUIS valider via `eligiblePairs`/`pairRoutes` (une page n'existe que s'il y a un bus direct). Gérer les noms compare non mappés (`Elounda`≠clé `Eloynta`, `Hersonissos`≠`Hersonisos`) et l'absence d'encart pour les comparaisons island/beach (~8/15 n'auront jamais de pair). **Ancre NEUTRE** (pas « horaires de bus X-Y » qui re-densifierait « bus » sur compare = effet inverse). compare ne doit jamais porter « bus » en title/H1/corps.

### P1 — On-page striking distance

- **4.7 H1 index via `t()` (pas de hardcode).** `BusesClient.tsx:424` est EN/FR en dur ; la string 4-langues `T.title` (lignes 33-38) existe déjà -> brancher `t("title")` (règle d'un coup en/fr/de/el). **Corriger l'en-dash** dans `T.title` (« KTEL Bus Schedules – Crete » -> tiret simple/deux-points, [[feedback_no_emdash]]).
- **4.8 NON-EN = ROI le plus rapide (nouveau, finding review).** Le gisement le plus mûr = `/fi` `/nl` `/de` `/buses` pos 8-9. Traduire H1 + title + meta de l'index `/buses` pour **fi, nl** (aujourd'hui fallback EN) en plus de de/el. Quelques chaînes, fort levier. Sans ça, « pousser le striking-distance » ne couvre que l'anglais (le plus dur).
- **4.9 Purger le caractère flèche (3 emplacements).** `buses/[pair]/page.tsx` : H1 `⇄` (L281) + **breadcrumb JSON-LD `↔` (L248)** + **`T.title` meta `↔` (L30-33)**. Tout en « Bus X to Y » ([[feedback_zero_fleches]]). H1 cible « Bus {placeA} to {placeB}: Timetable & Prices ».
- **4.10 Profondeur de contenu data-driven.** Enrichir les pairs DIGNES (1er/dernier départ, durée, fréquence, notes KTEL, comparatif taxi existant). 100 % data-driven, **zéro invention** ([[feedback_marketing_facts]]). Traiter le near-duplicate : si 2 pairs partagent ≥X % de template, canonicaliser ou exclure.
- **4.11 Schema : abandon de Trip/BusTrip comme rich snippet.** Google ne rend aucun rich result transit. Garder le `FAQPage` + `BreadcrumbList` existants (inline `buses/[pair]/page.tsx:240-259`, PAS dans `schema.ts`). Si on pose un `Trip` (aide entité, faible valeur), **ne PAS émettre `offers`/prix quand `price_estimated=true`** (`buses.ts:21`). Effort schema -> minimal ; le gain CTR vient du title/H1 (4.7-4.9), pas d'un snippet transit.
- **4.12 `ItemList` URLs (index).** `schema.ts:619-628` : ajouter `url` par item = calculer `pairSlug(from,to)` + filtrer/dédupliquer sur `eligiblePairs` (ne pas mettre d'URL vers une paire inexistante).

### P3 -> remonté P1 : Housekeeping confiance crawl
- **4.13 `sitemap-news.xml` 432 erreurs.** Diagnostiquer (URLs invalides / format / dates). Un sitemap en erreur permanente pèse sur la confiance de crawl de toute la propriété = contre-productif pour P0. Au minimum le retirer de GSC tant que cassé. (+ liens pré-existants morts `faq/page.tsx:90`, `search/page.tsx:161,166` vers slugs getting-around inexistants -> corriger au passage.)

## 5. Multilingue (22 langues)
Pairs + index existent en 22 locales avec hreflang (`buildAlternates` `seo.ts:9-17`, self-canonical confirmé, pas de noindex sur les pairs). Redirects §4.5 locale-aware sur les 22. Nouveaux libellés (encart compare, H1, fi/nl) en en/fr/de/el (+fi/nl pour l'index), fallback EN ailleurs.

## 6. hreflang — test 200-partout obligatoire (finding review)
Règle Google : toute URL d'un set hreflang doit renvoyer 200, sinon le set est ignoré. Avant de poser les 301 (§4.5) : crawler les 22×N alternates des pages CONSERVÉES (buses index, pairs, getting-around airport/ferry, compare) et confirmer **200 partout**. Vérifier qu'aucune page conservée ne liste les 4 slugs supprimés dans ses alternates. Vérifier que les 18 locales ISR des pairs rendent 200 (pas 404).

## 7. Tests
- Élagage : pairs sans horaires = noindex + hors sitemap ; pairs dignes = indexables + sitemap.
- lastmod = max(scraped_at) par paire, n'avance que si contenu changé.
- Redirects : `/{locale}/getting-around/{4 slugs}` -> 301 `/{locale}/buses/{slug}` (en/fr/de/el + fallback), APRÈS indexation cible.
- Maillage : 0 lien interne `buses -> getting-around` redirigé ; DepBoard rows cliquables -> pair (si intégré ici).
- Encart compare : présent si pair existe (mapping + eligiblePairs), absent sinon (island/beach, noms non mappés).
- hreflang : 200 sur tous les alternates des pages conservées.
- Non-régression : `/buses` + pairs rendent (SSR), H1 via `t()`, FAQ intacte, 0 caractère flèche.
- Post-deploy : URL Inspection GSC sur 5 pairs dignes (passage Discovered -> Indexed).

## 8. Mise en ligne (ordre corrigé)
1. **Coordination** : attendre/rebaser après merge `feat/bus-network` (refactor `bus-pairs.ts`). Worktree `feat/seo-buses`.
2. Élagage near-duplicate (4.1) + sitemap lastmod honnête (4.2) + ItemList URLs (4.12).
3. On-page : H1 `t()` + fi/nl (4.7-4.8) + purge flèches (4.9) + profondeur (4.10).
4. Maillage entrant (4.3) dont DepBoard (coordonné).
5. **Attendre indexation** (URL Inspection : pairs dignes -> Indexed, ~2-6 sem).
6. PUIS redirects 301 getting-around + cleanup RELATED/GETTING_AROUND (4.4-4.5) + encart compare (4.6), après check hreflang (§6).
7. Housekeeping sitemap-news (4.13).
8. Vert (tsc + build) -> preview Vercel -> validation visuelle -> `master` puis `master:main` (fetch avant, FF only).

## 9. Critères de succès — 2 gates découplés (finding review)
- **Gate A (objet de ce spec, mesurable J+30, sauve le checkpoint Phase 10 « noindex 25/07 »)** : les pairs DIGNES passent de « Discovered – not indexed » à **Indexed** + 1re impression GSC (aujourd'hui 0). La décision « noindex 25/07 » dépend de Gate A, PAS du ranking de l'index.
- **Gate B (8-12 sem, dépend de l'autorité hors-scope = P2)** : `/en/buses` top 10 sur « crete bus routes/schedule » ; `/fi` `/nl` `/buses` entrent dans le pack haut sur « bus crete ». Découplé du checkpoint noindex.
- Zéro page non-bus (compare/getting-around) en pos < 10 sur « X to Y bus ».

## 10. Risques (corrigés)
| Risque | Mitigation |
|---|---|
| Diagnostic mal posé (état GSC) | §4.0 : lister l'état réel des 89 slugs avant d'agir |
| Index bloat (89 templates minces) | §4.1 élaguer/noindex les pairs sans horaires = action #1 |
| Redirect avant indexation = perte sèche | §4.5 ordre inversé : indexer d'abord, rediriger après |
| hreflang cassé par 301 sur 22 locales | §6 check 200-partout avant les redirects |
| Collision merge `bus-pairs.ts` (feat/bus-network actif) | §8.1 séquencer après bus-network ; dériver slugs de `eligiblePairs` à l'exécution, pas de hardcode |
| Effort gaspillé sur schema transit | §4.11 abandon BusTrip rich-snippet (Google ne le rend pas) |
| Encart compare re-densifie « bus » | §4.6 ancre neutre, compare sans token bus |
| Attentes ranking trop optimistes 25/07 | §9 Gate A (indexation) découplé de Gate B (ranking, backlinks) |

## 11. Points à valider Kami (avant plan)
1. **Élagage (§4.1) — TRANCHÉ Kami 15/06 = ÉLAGAGE AGRESSIF** : noindex + retrait sitemap des pairs sans horaires publiés, focus ~40 pairs qualité. Le levier « Discovered -> Indexed ».
2. **getting-around aéroport/ferry (§4.4)** : re-indexer ce sous-ensemble (4 routes, pos 9-11) ou tout laisser noindex ?
3. **DepBoard cliquable (§4.3)** : l'intégrer à CE chantier, ou le laisser au terminal qui l'a specّé et juste se coordonner ?
4. **Profondeur (§4.10)** : data-driven only (zéro invention) confirmé ? (pas de paragraphe éditorial par trajet)
5. **P2 backlinks** confirmé hors de ce chantier (rapport Hélène, owner Kami) ?
6. **Séquencement** : OK pour attendre le merge `feat/bus-network` avant de lancer l'impl (évite la collision `bus-pairs.ts`) ?
