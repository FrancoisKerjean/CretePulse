# Ligne édito Meta quotidienne « Aujourd'hui en Crète » — vidéo + carrousel complémentaires

Date : 2026-06-13
Auteur : Kami + Claude
Statut : design validé (timing + sources tranchés), spec en revue avant plan

## Contexte

Avant ce design, le compte `@cretedirect` (IG) + Page FB « Crete Direct » recevaient
deux flux Meta incohérents :

1. **Beach reel** (`cretepulse-video`, compo Remotion `CreteSwimToday`) — vidéo « Où se
   baigner aujourd'hui », cron 06:00 UTC (09:00 Athens), IG + FB. C'est la ligne édito
   voulue, **mais la vidéo est jugée pas dynamique / peu engageante** (slideshow mou).
2. **Carrousel news** (`crete-direct-instagram`, HTML→9 PNG) — carrousel quotidien depuis
   le news-recap, cron 17:30 UTC (20:30 Athens). **Hors ligne édito**, désinstallé le
   13/06 18:00 (cron sorti de `/etc/cron.d` → `/root/disabled-crons.*`, runner renommé
   `.DISABLED-*`). Post du 13/06 (`p/DZiNbMGjtGU`) à supprimer manuellement (l'API IG ne
   permet pas la suppression de media : Graph `DELETE /{media}` → `(#10) Insufficient
   permissions`).

Objectif : une **ligne édito cohérente** = **1 vidéo + 1 carrousel par jour**, messages
**complémentaires** (pas redondants), tous deux ancrés sur le même jour (plage du jour +
météo du jour).

## Concept directeur — « Aujourd'hui en Crète »

Chaque jour, **une même plage héros + une même météo**, déclinées en deux temps qui se
répondent :

- **VIDÉO = l'émotion.** « Voici où te baigner aujourd'hui ». LA plage du jour en
  cinématique, donne envie de venir. Légende qui renvoie vers le carrousel + le site.
- **CARROUSEL = l'utilité.** La data exploitable : météo du jour détaillée (vent par
  zone, temp de l'eau, vagues), 3-4 plages alternatives notées et abritées du vent,
  plages à éviter, conseils. Légende qui renvoie vers `crete.direct`.

Cohérence : même plage héros du jour dans les deux, même charte couleur/typo. La vidéo
accroche, le carrousel délivre. Cross-link explicite entre les deux légendes.

## Direction visuelle (décision Kami 13/06) : charte graphique + Kriri, PAS l'immersif photo

**Pivot assumé.** Les photos plage du jour (`imageUrl` du feed) sont de qualité
insuffisante. On **abandonne l'immersif photo** (ken burns / fonds photo plein cadre) au
profit de la **charte graphique « Kalimera »** + la mascotte **Kriri** (le kri-kri) en
**présentateur des infos**.

Cohérence avec la DA du site : la DA Kalimera (`2026-06-11-brand-da-kalimera-design.md`)
prévoit déjà le **style D « abstraction lumineuse »** (compositions de radial-gradients
organiques soleil/eau/terracotta + grain, zéro figuratif) **pour les vrais vides**. On
traite les mauvaises photos comme des vides → fonds abstraction lumineuse, pas de photo.

⚠️ **Divergence volontaire** : sur le site, Kriri est « discret, jamais hero ni nav » et
les illustrations figuratives sont rejetées au profit de la photo. **Sur Meta on élève
Kriri au rôle de présentateur récurrent** — choix brand-building social assumé par Kami,
distinct du site. Kriri reste fidèle à son design SVG existant (`src/components/KriKri.tsx`,
4 humeurs : `hello`/`alert`/`empty`/`lost`).

### Système visuel commun (vidéo + carrousel)
- **Palette Kalimera** : `--lagoon #00C2D4`, `--lagoon-deep #008C9E`, `--sun #FFC83D`,
  `--terracotta #ED7A5C` (plage du jour / alertes douces), `--night #07374A` (surfaces
  sombres type board), `--ink #0B3954` (texte), `--foam #F6FBFC`, `--sand #FFF3D6`.
  Statuts sémantiques : ok `#14B86B` · warn `#FFC83D` · alert `#E5484D`.
- **Typo** : **Baloo 2** (600/700/800) pour titres, UI forte et **toutes les données
  chiffrées** (`tabular-nums`) ; **Geist** pour corps long. Fallback grec/cyrillique :
  Comfortaa (Baloo 2 ne couvre pas le grec).
- **Fonds** : abstraction lumineuse (radial-gradients + grain), jamais photo plein cadre.
- **Données en grosses tuiles couleur** (alternance lagon texte-nuit / mer profonde
  texte-blanc, chiffres géants) — principe « Waze » de la DA, données live rendues ludiques.
- **CreteMap** : silhouette de la Crète (depuis coordonnées réelles) + pins lat/lng pour
  « où est la plage » (pin plage du jour en terracotta).
- **Kriri présentateur** : pose `hello` (Καλημέρα) en intro/accueil, `alert` quand vent
  fort / plages à éviter, expression cohérente avec la donnée.
- **Arrondi généreux** (cartes 24-32px, pills), ombres douces colorées.
- **Règles micro-copy DA** : Καλημέρα/Καλησπέρα selon l'heure ; **aucune flèche « → »**
  accolée aux libellés ; **aucun tiret cadratin « — »** (séparateurs : « · », virgule,
  point, deux-points).

## Source de données unique : feed `swim-today`

`GET {SITE_URL}/api/internal/swim-today?secret=…` renvoie **tout** le nécessaire pour les
deux formats (confirmé 13/06, HTTP 200) :

```
date            : "2026-06-13"
wind            : { cardinal, minSpeed, maxSpeed }       # vent global du jour
pick            : { name, slug, region, imageUrl, rating, windCardinal, windSpeed,
                    waveHeight, seaTemp, bus, fromCities[2], lat, lng }   # plage héros
alternatives[9] : [ {même forme que pick} ]              # alternatives notées
avoid[2]        : [ {même forme, rating:"exposed"} ]     # plages à éviter
```

Conséquence : **aucun nouvel endpoint météo à créer** (décision Kami). La « météo
détaillée » du carrousel = `wind` global + `windCardinal`/`windSpeed`/`waveHeight`/
`seaTemp` par plage. Si un champ manque pour un visuel, on dégrade proprement (n'affiche
pas plutôt qu'inventer).

## Chantier 1 — Vidéo : redesign dynamique de `CreteSwimToday`

**On garde tout le pipeline existant** (`cretepulse-video`) :
feed `swim-today` → script VO déterministe (aucun LLM) → Kokoro `voice.mp3` →
timestamps Whisper → `totalFrames` calé sur la durée VO → render Remotion
`CreteSwimToday` → `out/crete-swim-YYYY-MM-DD.mp4` → upload IG + FB Page
(cron `cretepulse-daily-video` 06:00 UTC inchangé).

**On refait uniquement la composition Remotion** avec le `motion-design-system` (projet
`~/my-video` conventions de moves) **dans la charte Kalimera, sans immersif photo**, pour
passer de « slideshow photo mou » à « reel graphique branché données + Kriri » :

- **Intro Kriri** : Kriri pose `hello` + « Καλημέρα ! » (ou Καλησπέρα selon l'heure),
  fond abstraction lumineuse (radial-gradients lagon/soleil + grain), titre Baloo 2
  « Crète · [date] ». Kriri introduit la plage du jour.
- **Carte plage du jour** : `CreteMap` silhouette + pin terracotta animé qui se pose sur
  `lat`/`lng` (où est la plage), nom de la plage en Baloo 2.
- **Tuiles données animées** : temp eau (`seaTemp`), vent (`windCardinal` + `windSpeed`),
  note baignade (`rating`) en **grosses tuiles couleur** (lagon / mer profonde),
  chiffres Baloo 2 `tabular-nums` qui s'imposent (compteurs / pop-in), pins gouttes.
- **Kriri `alert`** si vent fort ou si la donnée pousse une plage à éviter (meltemi).
- **Transitions dynamiques** (wipes/reveals rythmés, vagues séparatrices SVG),
  **captions VO animées mot-à-mot** (timestamps Whisper déjà produits), micro beat-sync
  si simple.
- **Outro CTA brandée** wordmark `crete.direct` + soleil, teasing « alternatives +
  météo détaillée → carrousel ce soir ».
- Format 1080×1920, durée = durée VO + tail (déjà géré). Mouvement Remotion-driven.

Contrainte : rester **déterministe et render-safe** (Remotion seek), pas de
state/async non maîtrisé. La VO et le contenu restent pilotés par le feed. La photo plage
n'est PAS utilisée en fond (abstraction lumineuse à la place) ; si on veut un rappel photo,
vignette secondaire traitée (voile DA) seulement, jamais plein cadre.

## Chantier 2 — Carrousel : réutiliser l'infra, nouveau générateur thématisé

**On réactive `/opt/crete-direct-instagram`** (HTML→PNG via Playwright + upload via
`upload-instagram-carousel.mjs`, déjà fonctionnels) **avec un nouveau générateur** branché
sur `swim-today` (et non plus le news-recap) :

- **~6 slides** (au lieu de 9, plus serré), **tout en charte Kalimera + Kriri, fonds
  abstraction lumineuse (pas de photo plein cadre)** :
  1. **Hook** — Kriri `hello` + « Καλησπέρα ! » (soir), météo du jour (vent global) +
     plage héros teasée (« On se baigne où demain ? »), wordmark crete.direct.
  2-4. **3 plages alternatives** notées `calm`/abritées : nom, région, note baignade,
     vent, temp eau — en **tuiles couleur** (lagon / mer), chiffres Baloo 2 `tabular-nums`.
     Mini-`CreteMap` avec pin par plage si lisible.
  5. **Météo détaillée par zone** (vent cardinal + force, temp eau, vagues) + bloc
     **« à éviter aujourd'hui »** (Kriri `alert`) depuis `avoid`.
  6. **CTA** — wordmark `crete.direct` + lien planner bus `crete.direct/buses` (« comment
     y aller »), sur bande sable.
- **Charte alignée sur la vidéo du jour** (palette Kalimera, **Baloo 2** titres+données /
  Geist corps / Comfortaa fallback grec, arrondi 24-32px, ombres colorées). Même plage
  héros que la vidéo du matin.
- **Rendu HTML→PNG** : le template HTML charge la charte Kalimera (CSS tokens) — référence
  visuelle `docs/design/kalimera/krikri.html` + `home-v8.html` (mockups validés).
- Upload carrousel IG via le script existant (token partagé
  `/opt/cretepulse-video/instagram-tokens.json`, `ig_user_id 17841448998722881`).
- **Pas de langage influenceur** (« follow/save ») — convention déjà en place sur le reel.
- **Règles DA** : aucune flèche « → », aucun tiret cadratin « — » (séparateur « · »).
- Idempotence par jour (slug date) conservée.

NB : le runner `render-carousel-today.sh` actuel est neutralisé (`.DISABLED-*`). On crée un
**nouveau wrapper** (nom distinct, ex `render-daily-carousel.sh`) plutôt que de ressusciter
l'ancien, pour éviter toute confusion avec le pipeline news mort.

## Timing & crons (décision Kami : matin + soir)

| Format    | Heure Athens | UTC   | Cron |
|-----------|--------------|-------|------|
| Vidéo     | 09:00        | 06:00 | `cretepulse-daily-video` (existant, inchangé) |
| Carrousel | 19:00        | 16:00 | **nouveau** `/etc/cron.d/crete-direct-daily-carousel` |

Rationale : hook baignade le matin (on décide où aller dans la journée), carrousel utile
le soir (on planifie le lendemain / récap). Deux moments de présence dans le feed, pas de
cannibalisation.

## Cross-link des légendes

- **Vidéo (matin)** : « 📍 [Plage] · eau [seaTemp]°, vent [cardinal]. Toutes les
  alternatives + la météo détaillée → en story/carrousel ce soir. crete.direct »
- **Carrousel (soir)** : « La météo + les meilleures plages de demain. Itinéraires bus →
  crete.direct/buses ». Renvoi vers le site, jamais de promesse non tenue.

(Légendes EN en primaire — audience touristes/expats —, on garde la convention du reel.)

## Découpage en unités

1. **`CreteSwimToday` v2** (compo Remotion) — entrée : props depuis feed ; sortie : MP4.
   Testable en preview Remotion isolément.
2. **Générateur carrousel** (`generate-daily-carousel.mjs` + template HTML + render PNG) —
   entrée : `swim-today` JSON ; sortie : N PNG. Testable hors upload.
3. **Wrapper + cron carrousel** (`render-daily-carousel.sh`, `cron.d`) — orchestration +
   upload + idempotence.
4. **Légendes** (déjà dans les scripts upload) — texte déterministe depuis le feed.

Chaque unité a une frontière claire (feed → rendu → upload) et se teste séparément.

## Hors scope (YAGNI)

- Pas de nouvel endpoint météo (le feed suffit).
- Pas de géotag IG (perms Graph location, déjà tracé comme reste non bloquant).
- Pas de stories (on reste feed reel + feed carrousel ; stories = itération future).
- Pas de suppression auto des anciens posts news (impossible par API ; manuel Kami).

## Restes / owners

- **Kami** : supprimer manuellement le carrousel news du 13/06 (`p/DZiNbMGjtGU`) + purger
  les carrousels news des jours précédents sur le feed.
- **Claude (impl.)** : redesign compo vidéo ; nouveau générateur + wrapper + cron
  carrousel ; vérifier rendu des deux en preview avant d'armer les crons.
