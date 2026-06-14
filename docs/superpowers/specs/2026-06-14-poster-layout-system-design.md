# Système de layout « Poster » (option C) — design

Date : 2026-06-14
Auteur : Kami + Claude
Statut : direction validée (Kami : « la C est bien », contrainte « pas de superposition »), spec en revue avant plan

## Contexte & problème

La DA Kalimera (palette, Kriri, motion) est unifiée sur les 3 contenus (reel, carrousel,
météo). Mais Kami a critiqué la **composition** : « il faut utiliser l'espace central et
pas mettre des petits textes en haut et en bas… visuellement percutant… pas une ambiance
intelligence artificielle… l'espace est mal exploité. »

Mockups A/B/C proposés → **Kami choisit C (poster color-block)** + une contrainte ferme :
**les éléments ne doivent jamais se superposer.**

## La loi « Poster » (option C)

Chaque écran (slide carrousel, beat vidéo) obéit à :

1. **Fond couleur plein** (full-bleed) : `--night` ou `--lagoon`/`--sea`, jamais de gris/
   blanc neutre. Un seul **accent lumineux radial** (soleil `--sun` en coin, ou halo lagon)
   — pas de dégradé timide « IA ».
2. **UN point focal central**, vertically centered, en pile serrée :
   `eyebrow` (petit, ex. TODAY'S BEACH) → `headline` géant (nom, Baloo 800, peut wrapper
   sur 2 lignes, 1 mot en couleur d'accent) → `chiffre héros` ÉNORME (température, Baloo,
   `--sun` ou `--terra`) → `pills statut` (CALM / vent).
3. **Type qui remplit le cadre** : la typo EST le visuel. Gros, gras, color-blocking.
   Aucun petit texte qui flotte en haut/bas.
4. **Kriri intégré en marge** (un coin), **jamais par-dessus** le texte/chiffres.
5. **Wordmark `crete.direct`** dans le coin opposé, petit.

### Variante « liste » (slides multi-items, ex. 3 alternatives)
Quand un écran montre plusieurs éléments (les 3 plages alternatives), pas de point focal
unique : **grandes cartes empilées qui occupent le centre vertical** (titre intégré en
haut de la pile, pas en bordure), chiffres gros à droite de chaque carte. Toujours full-
bleed couleur, toujours sans scatter haut/bas.

### Règle anti-superposition (non négociable, Kami)
- **Zones de sécurité** : le bloc focal central a une marge réservée ; Kriri et le wordmark
  vivent dans les marges (coins), avec une bbox qui **ne croise jamais** la bbox du texte.
- Implémentation : positionnement explicite (coins fixes pour Kriri/wordmark, bloc central
  borné). Vérification visuelle obligatoire sur le rendu réel (pas seulement le code).
- Si Kriri est grand (cas mascotte-héros), il prend SON écran/zone et le texte se cale
  ailleurs — jamais l'un sur l'autre.

## Application aux 3 contenus

- **Carrousel** (`render-swim-html.mjs`) : 6 slides en loi Poster.
  - Cover : eyebrow « TODAY » + headline « Where to swim today? » centré + Kriri coin.
  - Plage du jour : poster focal (nom + 25° géant + pills) — exactement la maquette C.
  - Alternatives : variante liste (3 cartes centrées).
  - Carte « où » / météo / CTA : posters focals.
- **Reel** (`CreteSwimToday.tsx`) : chaque beat = poster focal central (fini le titre en
  haut + sous-texte en bas). Le 25°/nom au centre, Kriri en marge, transitions punchées.
- **Météo** (`CreteWeatherMap.tsx`) : cas particulier (la carte EST le visuel central).
  - Réduire le vide : la carte occupe **plus** le cadre (moins de bandes foam vides
    haut/bas).
  - Données ville en **overlay central bold** sur la carte (gros temp + nom), pas une
    petite tuile en bas. Kriri en coin.

## Ordre d'exécution (itératif, de-risk)
1. **Carrousel d'abord** (HTML statique → rendu PNG rapide, on juge le réel vite).
2. Une fois validé visuellement par Kami → **reel** (même langage).
3. Puis **météo** (overlay central + carte plus pleine).
Chaque étape : rendu réel + contrôle anti-superposition avant de passer à la suivante.

## Hors scope
- Pas de nouvelle donnée / pipeline (mêmes feeds, schémas, crons).
- Langue = anglais (déjà acté).
- News : viendra avec le même langage après la météo.

## Vérification
Carrousel : `node --test` (les tests d'assertion de structure restent verts) + rendu PNG
des 6 slides + **contrôle visuel anti-superposition**. Reel/météo : `tsc` + stills + MP4 +
contrôle visuel. Le critère d'acceptation principal est visuel (percutant, central, zéro
superposition), validé par Kami sur le rendu réel.

## Restes / owners
- **Claude (impl.)** : carrousel → reel → météo, loi Poster, contrôle anti-superposition.
- **Kami** : valider le rendu réel de chaque étape ; restes indépendants (token YouTube,
  salutation grecque, carrousel FR du jour, news).
