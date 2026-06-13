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
`~/my-video` conventions de moves), pour passer de « slideshow » à « reel dynamique » :

- **Intro punchée** : titre animé « Crète · [date] » + nom de la plage héros, fond plage
  héros en **ken burns serré** (scale + pan continus, pas statique).
- **Mini-carte localisation animée** : point qui se pose sur `lat`/`lng` (où est la
  plage), zoom léger.
- **Stats en compteurs animés** : temp eau (`seaTemp`), vent (`windCardinal` +
  `windSpeed`), note baignade (`rating`) — chiffres qui s'incrémentent / s'imposent, pas
  juste posés.
- **Transitions dynamiques** entre plans (wipes/reveals rythmés), **captions VO animées
  mot-à-mot** (timestamps Whisper déjà produits), micro beat-sync si simple.
- **Outro CTA brandée** `crete.direct` (réflexe marque) + teasing « alternatives en
  carrousel ».
- Format 1080×1920, durée = durée VO + tail (déjà géré).

Contrainte : rester **déterministe et render-safe** (Remotion seek), pas de
state/async non maîtrisé. La VO et le contenu restent pilotés par le feed.

## Chantier 2 — Carrousel : réutiliser l'infra, nouveau générateur thématisé

**On réactive `/opt/crete-direct-instagram`** (HTML→PNG via Playwright + upload via
`upload-instagram-carousel.mjs`, déjà fonctionnels) **avec un nouveau générateur** branché
sur `swim-today` (et non plus le news-recap) :

- **~6 slides** (au lieu de 9, plus serré) :
  1. **Hook** — météo du jour (vent global, ciel) + plage héros teasée (« On se baigne
     où aujourd'hui ? »)
  2-4. **3 plages alternatives** notées `calm`/abritées : nom, région, note baignade,
     vent, temp eau, image.
  5. **Météo détaillée par zone** (vent cardinal + force, temp eau, vagues ; éventuel
     bloc « à éviter aujourd'hui » depuis `avoid`).
  6. **CTA** — `crete.direct` (et lien planner bus `crete.direct/buses` pour « comment y
     aller »).
- **Charte alignée sur la vidéo du jour** (mêmes couleurs, même plage héros, typo
  Playfair/Inter cohérente avec la marque crete.direct).
- Upload carrousel IG via le script existant (token partagé
  `/opt/cretepulse-video/instagram-tokens.json`, `ig_user_id 17841448998722881`).
- **Pas de langage influenceur** (« follow/save ») — convention déjà en place sur le reel.
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
