# Vidéo météo unifiée « CreteWeatherToday » — DA Kalimera + Kriri + motion court — design

Date : 2026-06-14
Auteur : Kami + Claude
Statut : design validé (4 décisions tranchées), spec en revue avant plan

## Contexte & problème

La ligne édito Meta a maintenant deux contenus à la DA **Kalimera + mascotte Kriri + motion
dynamique** : le reel `CreteSwimToday` (09:00) et le carrousel swim (19:00). Mais les
**vidéos YouTube** (météo 06:35, news 20:05) sont restées sur l'**ancienne DA** :
`CreteWeatherMap.tsx` utilise un badge terracotta « CRETE WEATHER », une palette
terracotta/aegean/ink différente, pas de Kriri, ~55 s, 6 villes. Résultat : les 3 contenus
quotidiens ne partagent pas la même direction artistique.

Demande Kami (verbatim) : « la DA est pas uniforme pour les 3, faut que ça soit dynamique
type hybride motion design + charte graphique site internet + infos courtes et faciles. »

Ce chantier unifie la **vidéo météo** sous la DA Kalimera (news = chantier séparé ensuite).

### Bug structurel à corriger au passage
La vidéo météo **plante par intermittence** depuis des semaines (`durationInFrames must be
positive, but got -46` ; `inputRange must be strictly monotonically increasing`). Cause
racine : dans `render-daily.mjs`, le timing des scènes ville est **dérivé de l'instant où
chaque ville est prononcée dans la VO** (matching mot Whisper, `mentionFrame`). Quand le
matching échoue, sort de l'ordre, ou que deux villes sont proches, `endFrame =
nextMention - lead - 1` devient ≤ `startFrame` → durée négative/courte → crash render. Ça a
été rustiné plusieurs fois sans être résolu. La refonte le supprime par design.

## Décisions validées (Kami, 14/06)

1. **Carte de Crète animée GARDÉE**, restylée Kalimera (la DA prévoit « l'île comme carte
   vivante »). Pas de bascule full-tuiles.
2. **Court & punchy : ~15-20 s** (vs ~55 s).
3. **4 villes fixes** : Chania, Rethymno, Heraklion, Agios Nikolaos (ouest→est, réparties
   sur la côte nord = « toute la Crète » d'un coup d'œil). Pas de sélection « plus
   contrastée ». Le drame météo passe par **Kriri** (réaction soleil/pluie/vent) + une ligne
   résumé, pas par le choix des villes.
4. **Périmètre** : météo d'abord, news ensuite (plan séparé).

## Couche marque partagée (ce qui rend les 3 enfin uniformes)

Aujourd'hui la palette Kalimera est dupliquée : `src/compositions/swim/helpers.ts` exporte
`C` (reel). On crée une **source unique** :

- **`src/components/brand.ts`** : exporte `C` (palette Kalimera), `RATING`, les familles de
  fonts chargées (Baloo 2 + Geist via `@remotion/google-fonts`), et helpers transverses
  (`cardinalDeg`, etc.).
- `src/compositions/swim/helpers.ts` **re-exporte** `C`/`RATING` depuis `brand.ts`
  (one-liner, le reel continue de marcher sans changement de ses imports).
- La compo météo importe `C`, `KriKri`, et un `AbstractBg` depuis cette couche commune.

Résultat : reel, carrousel-vidéo et météo partagent **littéralement les mêmes tokens**.

## Architecture de la vidéo (~15-20 s, 4 beats)

Format 1080×1920, 30 fps. La compo reste pilotée par props (schema), mais le **timing
devient des slots fixes** (plus de `mentionFrame`).

1. **Intro (~2.5 s)** : fond `AbstractBg` (abstraction lumineuse Kalimera) + Kriri (Καλημέρα,
   humeur selon météo dominante) + titre Baloo « Crete weather · [date] » + la carte de
   Crète qui apparaît (fade/scale).
2. **Carte vivante (~10-12 s, 4 villes)** : la carte reste affichée ; pour chaque ville (slot
   fixe ~2.5-3 s), une **bulle température pop-in** (restylée Kalimera : pastille lagon/nuit,
   chiffre Baloo tabular, icône météo) + une **card flottante** courte (ville, X°/min,
   1 mot météo, vent). Les bulles précédentes restent visibles (carte qui se remplit).
3. **Résumé du jour (~2.5 s)** : une grosse tuile lisible d'un coup d'œil (« Hot today · NW
   wind » / température dominante) + Kriri qui réagit.
4. **Outro (~2.5 s)** : wordmark `crete.direct` + CTA, fond Kalimera.

Captions VO **mot-à-mot** (Whisper) en overlay bas, comme le reel (réutilise le même
pattern), mais elles ne pilotent plus le timing des scènes.

### Composants
- `src/components/brand.ts` — tokens partagés (créé).
- `src/components/KriKri.tsx` — réutilisé tel quel (présentateur).
- `src/compositions/weather/AbstractBg.tsx` *(ou réutilise celui de swim via la couche
  commune)* — fond abstraction lumineuse.
- `src/compositions/weather/CreteMapKalimera.tsx` — la carte de Crète restylée + bulles temp
  (refonte du `DynamicWeatherMap` actuel, palette Kalimera, pop-in spring, timing par slot).
- `src/compositions/weather/WeatherTile.tsx` — card ville courte + tuile résumé.
- `src/compositions/CreteWeatherMap.tsx` — réécrit : assemble intro/carte/résumé/outro en
  slots fixes, importe la couche commune. **Garde l'export `creteWeatherMapSchema` et l'id
  de composition** (Root.tsx inchangé).

## Timing robuste (élimine le crash)

Dans `render-daily.mjs` (chemin `daily-weather`) :
- **Cap à 4 villes** (Chania, Rethymno, Heraklion, Agios Nikolaos) au lieu de 6.
- **Supprimer le matching `mentionFrame`** (tout le bloc Whisper-word → scene timing).
- **Slots fixes** : `introFrames = 2.5*FPS`, `outroFrames = 2.5*FPS`, `cityFrames =
  floor((totalFrames - intro - outro) / 4)`, chaque ville `startFrame = intro + i*cityFrames`,
  `endFrame = start + cityFrames - 1`. Tous **garantis positifs et croissants**.
- `totalFrames` reste calé sur la durée réelle de la VO (clampé à un plancher), mais la VO
  est désormais **courte** (script raccourci → ~15-20 s).
- Le schema `cityScenes` (startFrame/endFrame) reste, alimenté par ce calcul déterministe.

### VO raccourcie
Script Kokoro météo réécrit court : 1 phrase d'intro + 1 phrase par ville (4) + 1 ligne
résumé + CTA. Cible ~15-20 s. Voix inchangée (`bm_george`). Whisper captions inchangé.

## Hors scope (YAGNI)
- News video (chantier séparé, même DA, juste après).
- Root-cause timing pour la news (sera traité dans son chantier).
- Pas de nouvelle source de données (Open-Meteo 4 villes au lieu de 6, même API).
- Pas de YouTube re-auth (problème token séparé, action Kami).

## Vérification
Projet sans runner de test → `tsc --noEmit` (VPS) + rendu **still** par beat + **rendu MP4
complet** via `render-daily.mjs` avec vraies données (prouve : plus de crash, ~15-20 s, DA
Kalimera, 4 villes, Kriri). Comparaison visuelle avant/après. Le cron 06:35 et l'upload
YouTube restent inchangés (l'upload est bloqué par le token expiré, indépendant de ce
chantier).

## Restes / owners
- **Claude (impl.)** : couche brand partagée, refonte compo météo + composants, timing fixe
  dans render-daily.mjs, VO courte, vérif rendu.
- **Kami** : ré-auth YouTube (débloque la publication, séparé) ; valider le MP4 météo
  redesigné ; GO news ensuite.
