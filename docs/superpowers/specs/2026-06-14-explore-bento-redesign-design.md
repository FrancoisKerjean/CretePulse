# Refonte page `/[locale]/explore/[slug]` — direction Bento

**Date :** 2026-06-14
**Mockup de référence :** `C:\Users\fkerj\crete-direct-explore-mockup.html` (colonne C)

## Contexte

La page actuelle `src/app/[locale]/explore/[slug]/page.tsx` rend, pour les types autres que plages (monastères, gorges, plateaux, villages), un hero photo suivi d'un long bloc de description en prose. Les attributs structurés (`sand_type`, `water_color`, `depth`, etc.) sont vides hors plages, donc la grille `<dl>` ne s'affiche pas et il ne reste que du texte brut. Constat utilisateur (Kami, 14/06/2026) sur l'exemple `agia-pelagia-church-at-ano-viannos` : "page de texte illisible".

Hypothèse utilisateur : le touriste cible est "super flemmard". Il ne lit pas. Il scanne.

## Objectif

Refondre la page lieu pour atteindre du **quasi-zéro texte visible par défaut** : la première impression est entièrement visuelle (chiffres, icônes, mini-cartes, photos sans légende). Le texte source long reste accessible mais plié.

## Direction choisie (validée 14/06)

**C. Bento panels** — grille éditoriale style magazine, vue d'oiseau, scan en 3 secondes, zéro narration séquentielle.

Rejetées :
- A. Passport (data-dense) → trop proche de l'actuel, manque de wow.
- B. Scrolly atomique → wow max mais coûte cher en code (sections snap, SEO délicat).

## Architecture (validée 14/06)

**Layouts dédiés par `place_type`.** Une seule grille générique ne suffit pas : chaque type a ses attributs signature (plages = sand/water/depth ; monastères = période/frescoes ; gorges = longueur/difficulté). Layouts cibles :

| Layout | place_type couverts | Tiles signature |
|---|---|---|
| `BeachBento` | Beach | sand · water · depth · sea · crowds · access · note · distance ville |
| `MonasteryBento` | Monasteries, Churches | période/siècle · date frescoes · distance village · accès marche · note · spécificité |
| `GorgeBento` | Gorge | longueur km · dénivelé · difficulté · durée · saison · accès |
| `VillageBento` | Village, Town | population · altitude · distance grandes villes · spécialités · note |
| `FoodBento` | Food, Restaurant, Cafe | type cuisine · gamme prix · note · distance plage · horaires · spécialité |
| `DefaultBento` | fallback (autres types) | note · distance ville · 2-3 tiles dérivées + 4 photos |

Choix de design : `~6-8` types à couvrir, fini, maintenable. Chaque composant ~100-150 lignes JSX. Total ~800 lignes.

## Composant racine

```
src/components/explore/bento/
  ExploreBento.tsx        ← router : switch(place.place_type) → variante
  BeachBento.tsx
  MonasteryBento.tsx
  GorgeBento.tsx
  VillageBento.tsx
  FoodBento.tsx
  DefaultBento.tsx
  shared/
    HeroCell.tsx          ← cell hero (photo + tag + h1)
    Tile.tsx              ← cell data (icon + big + label + variant=sun|terra|lagoon|sand)
    MapCell.tsx           ← cell mini-carte Crète + pin terracotta
    PhotoCell.tsx         ← cell photo simple, pas de légende
    NearbyCell.tsx        ← cell mini-carte zoomée + pins numérotés + texte compact
    DetailCell.tsx        ← cell "rare detail" (fond night + eyebrow + 1 phrase)
    ReadMoreAccordion.tsx ← accordion pliée par défaut, contient `paragraphs[]`
```

`ExploreBento` est le seul export utilisé par `page.tsx`. Il reçoit `place: CbPlace` (typage existant `@/lib/cb-places`).

## Page (`page.tsx`) après refonte

```
<main>
  <ExploreBento place={place} locale={locale} t={t} />
  <ReadMoreAccordion paragraphs={paragraphs} locale={locale} />  {/* plié */}
  {place.source_url && <SourceLink ... />}
</main>
```

Le hero plein-écran disparaît au profit de la HeroCell intégrée au bento. Le `<dl>` de grille attributs est supprimé (remplacé par les Tiles). La galerie 6 photos est intégrée comme PhotoCells. La liste `nearby` texte est remplacée par NearbyCell (mini-carte + pins).

## Origine des données pour chaque tile

| Tile | Source aujourd'hui | Action requise |
|---|---|---|
| Note ★ | `place.rating` | OK |
| Distance ville | dérivée `place.latitude/longitude` + table villes | Helper `nearestKnownTown(lat,lng)` à écrire |
| Période/siècle | extrait du texte description ("14th century") | **Enrichissement Supabase via script LLM** |
| Date frescoes | extrait ("1360 (this date is recorded...)") | **Enrichissement Supabase via script LLM** |
| Temps de marche | extrait ("walking through the narrow alleys") | **Enrichissement Supabase via script LLM** |
| Spécificité (sinners) | extrait ("interesting scenes of sinners") | **Enrichissement Supabase via script LLM** |
| Plages : sand/water/depth | déjà colonnes Supabase | OK |
| Gorges : longueur/difficulté | absent | **Enrichissement Supabase via script LLM** |

### Script d'enrichissement

Pattern : réutiliser `cretepulse-build/enrich-descriptions.mjs`. Ajouter `scripts/enrich-bento-tiles.mjs` qui :
1. Pour chaque `cb_place` selon son `place_type`, prompt LLM (Claude Haiku) avec sa `description` brute.
2. Demande structurée selon le type (ex monastère : `{ period, frescoes_date, walking_minutes, unique_feature }`).
3. Stocke dans nouvelles colonnes Supabase `bento_tiles JSONB` (1 champ blob par lieu, schéma libre selon type).
4. Idempotent : skip si `bento_tiles IS NOT NULL`.

Migration Supabase : `ALTER TABLE cb_places ADD COLUMN bento_tiles JSONB;`.

## Texte source long

Le champ `description` continue d'être nettoyé via `cleanCbDescription()` (existant) → `paragraphs[]`. Affiché dans `ReadMoreAccordion`, **plié par défaut**, libellé "Lire l'histoire" (FR) / "Read the story" (EN) / etc. selon `locale`.

Justification : préserve SEO (le texte reste dans le HTML server-rendered), accessibilité, valeur historique (les frescoes 1360 méritent d'être lisibles en détail). Mais l'utilisateur flemmard n'a pas à scroller dedans pour avoir l'info.

## SEO

- `<h1>` reste `place.name` dans HeroCell.
- Le `<JSON-LD>` (Place schema) reste server-rendered comme actuellement.
- Photos : `alt` reste descriptif (`alt={place.name + ' ' + (i+1)}`).
- Texte description : présent dans le DOM (accordion fermé via CSS, pas via `display:none` → indexable).
- Tile values : exposées comme `<dd>` dans des `<dl>` sémantiques (SEO + accessibilité).

## Responsive

Le bento s'adapte :
- **Desktop / tablette** : grille 6 colonnes (mockup référence).
- **Mobile** : grille reflow 2-4 colonnes selon cell. HeroCell prend toujours toute la largeur.

Test cible : mobile 360px → desktop 1440px sans casse.

## i18n

Toutes les chaînes (labels tiles, eyebrows, libellés accordéon) passent par `next-intl`. Ajouter namespace `bento` dans `messages/{fr,en,de,el,...}.json`. Les valeurs de tiles dérivées du LLM sont stockées en EN dans Supabase + traduites côté front via dictionnaires (`siecle`/`century`/`Jahrhundert`/...) pour les unités/labels seulement ; les noms propres (Ano Viannos) restent tels quels.

## Performance

- Pas de polices supplémentaires (Comfortaa + Inter déjà chargées).
- Mini-cartes Crète : SVG inline réutilisable (pattern existant des reels `CreteMiniMap.tsx`).
- Nearby map : SVG statique avec pins absolument positionnés ; pas de Leaflet (overkill).
- Photos : `next/image` existant, `loading="lazy"` sauf la première.
- Coût LLM enrichissement : ~24K lieux × 1 prompt Haiku ~$0.005 → ~$120 one-shot. Acceptable.

## Migration / déploiement

Phasage :
1. **Phase 1 — data** : migration Supabase + script enrichissement (1 type test = Monasteries en pilote, ~200 lieux). Valider la qualité des tiles dérivées.
2. **Phase 2 — UI Monastery** : `MonasteryBento` + `ExploreBento` router minimal. Branche `feat/explore-bento-monastery`. Preview Vercel sur `agia-pelagia-church-at-ano-viannos`. Validation Kami.
3. **Phase 3 — UI Beach** : `BeachBento` + enrichissement plages (les attributs structurés existent déjà, surtout des tiles dérivées).
4. **Phase 4 — gorges/villages/food** : un layout par PR.
5. **Phase 5 — fallback Default + cleanup** : ancien rendu (description prose pleine page) supprimé.

Fail-safe : tant qu'un layout n'est pas écrit, le router tombe sur `DefaultBento` (qui marche sans tiles enrichies, juste hero+nearby+photos). Pas de page cassée.

## Non-goals

- Pas de refonte du drawer `/explore` (la liste à gauche reste identique).
- Pas de refonte de la liste `/[locale]/beaches`, `/villages`, etc. (pages listing). Uniquement les fiches `/explore/[slug]`.
- Pas de système de "story" type scrolly (B rejeté).
- Pas de traductions automatiques des tiles via LLM côté front : tout enrichi en EN une fois, dictionnaire unités côté front.

## Open questions (à valider au review)

1. **Layouts par type** : la liste 6 (Beach/Monastery/Gorge/Village/Food/Default) couvre-t-elle bien le catalogue `cb_places` ? Vérifier la distribution `SELECT place_type, COUNT(*) FROM cb_places GROUP BY place_type` avant Phase 1.
2. **Enrichissement** : OK pour appeler Claude Haiku sur ~24K lignes (~$120) ou préférer un batch incrémental (top 1000 lieux les plus visités via GSC d'abord) ?
3. **"Lire l'histoire" accordéon** : libellé OK ? alternative `"Le récit complet ↓"` ?
4. **Mini-carte Crète** : réutiliser `CreteMiniMap.tsx` des reels (Remotion) en le portant Next, ou repartir d'un SVG dédié plus léger ?

## Acceptance criteria

- Pour Agia Pelagia, le rendu match la colonne C du mockup (palette, structure 6 cellules, accordion plié).
- Pour une plage représentative (ex `balos-beach`), le `BeachBento` affiche les 6 attributs structurés + note + distance ville en tiles.
- Lighthouse (mobile) : pas de régression > 5 points sur LCP/CLS vs actuel.
- SEO : `console.log(document.body.innerText.length)` reste > 200 caractères (texte du `description` toujours dans le DOM).
- Test visuel manuel sur les 5 layouts via 1 URL preview Vercel par layout.
