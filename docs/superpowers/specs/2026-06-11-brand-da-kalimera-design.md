# Design — Direction artistique « Kalimera » (identité de marque crete.direct)

Date : 11/06/2026. Validée par Kami sur mockups itérés (v1 almanach → v6 finale, 7 itérations
+ planche typo). Mockup de référence : `ui-da-v6-final.html` / `.png` (racine repo, non commité —
à archiver dans `docs/design/` au build). Recherche fondatrice : Flighty (Apple Design Award,
status board sémantique), Citymapper (couleur unique possédée), tendances 2026 (Figma/Fireart :
typo-architecture, color blocking), Ace Hotel Athens (modernisme grec).

## Le brief de Kami (verbatim condensé)

« Moderne, style arrondi, aux couleurs de la Crète, avec des références à la Crète qu'on
comprenne tout de suite où on est. Transmettre une ambiance de voyage, de Crète, d'outil,
de joie. Pas de police déjà vue. »

## Identité

### Wordmark dessiné (notre « propre police »)
Lettrage « cretedirect » monoline ronde tracé en SVG paths (pas une fonte) :
- **c initial en spirale** (le mark minoen devient lettre, turquoise foncé)
- **point du i en soleil rayonnant** jaune
- **vague turquoise** soulignant « direct »
Versions : fond clair (encre #0B3954), fond nuit (crème), compacte « c+soleil » pour favicon.
Source dans le mockup `ui-typo-trial.html`. Remplace le texte « CRETE ◉ DIRECT » partout
(header, footer, OG, favicon). Le CiMark spirale reste pour les usages icône seuls.

### Typographie
- **Display (titres, gros chiffres)** : **Baloo 2** (Google Fonts, 600/700/800) — ronde,
  joyeuse assumée. Choix Kami sur planche A/B/C/D. ⚠️ couvre latin/latin-ext + devanagari,
  PAS le grec/cyrillique/arabe/CJK → fallback display propre à définir (stack :
  `"Baloo 2", "Comfortaa", system-ui` — Comfortaa couvre grec+cyrillique et reste ronde).
- **UI courante** : Geist (existant).
- **Données** : Geist Mono `--font-data` (existant, conservé tel quel).

### Palette « Kalimera »
| Token | Hex | Rôle |
|---|---|---|
| `--lagoon` | #00C2D4 | LA couleur possédée (Balos/Elafonissi) : accents, liens, vagues, tags |
| `--lagoon-deep` | #008C9E | lagoon foncé (texte sur clair, hover) |
| `--sky` | #BDEDF5 | haut des gradients ciel |
| `--sea` | #0B5E78 | bleu mer profond (textes secondaires forts) |
| `--night` | #07374A | bleu nuit méditerranéen (surfaces sombres : board départs, footer) |
| `--sun` | #FFC83D | soleil : CTA chauds, point du i, mini-soleils |
| `--terracotta` | #ED7A5C | terre cuite vive : pins « plage du jour », alertes douces |
| `--olive` | #7C9A53 | l'île (silhouette), touches nature |
| `--foam` | #F6FBFC | fond de page |
| `--sand` | #FFF3D6 | surfaces chaudes |
| `--ink` | #0B3954 | texte principal |
| Sémantique | ok #14B86B · warn #FFC83D · alert #E5484D | statuts live (principe Flighty) |
Remplace la palette aegean/terra/stone actuelle (mapping de migration au plan).

## Grammaire visuelle

1. **Arrondi génreux** : cartes 24-32px de radius, pills partout (nav, statuts, chips),
   boutons pilule. Ombres douces COLORÉES (`rgba(11,94,120,.10-.22)`), jamais grises.
2. **Gradients méditerranéens** : ciel→lagon (heros), pastels chauds (tuiles météo
   sunny/seay). Fond de page foam, jamais blanc pur ni gris.
3. **Vagues séparatrices** : sections séparées par des courbes SVG organiques (wave divider),
   pas des lignes droites.
4. **L'île comme carte vivante** : silhouette de la Crète (générée depuis les coordonnées
   géographiques réelles, PAS le path à main levée du mockup) avec pins live positionnés
   par lat/lng : villes+températures, plage du jour (terracotta), « vous êtes ici ».
   Composant réutilisable `CreteMap` (home hero + beach finder + pages bus éventuelles).
5. **Le board départs** : carte nuit très arrondie, une ligne par trajet, horaire géant,
   statut en pill sémantique lumineuse (« dans 70 min » ok / « dernier du jour » warn).
6. **Καλημέρα** : la salutation grecque du moment (Καλημέρα/Καλησπέρα selon l'heure) en
   accroche du hero — la référence locale immédiate et chaleureuse.
7. **Mini-références** récurrentes : mini-soleils et mini-vagues dans les coins de tuiles,
   le soleil radial dans le hero, pins gouttes arrondies.

## Conservé des phases précédentes
- Icônes propriétaires spirale/vague (icons.tsx) — cohérentes avec la nouvelle grammaire.
- font-data mono pour toute donnée chiffrée.
- LiveBar (contenu identique, re-skinnée : intégrée à la nav pilule ou bandeau nuit arrondi).
- NextDeparture, CardThumb (voile à recalibrer lagon), PromoBox (re-skin pills).
- Structure home dashboard (hero réponse du jour + board + tuiles + outils + contenu).

## Hors scope
Fonte custom complète (impossible × 22 langues), dark mode, animations lourdes.
Mouvement : CSS only (pulses, hover lifts, gradient subtils).

## Vérification au build
Captures avant/après sur les 8 pages de l'audit, Lighthouse home ≥ baseline, zéro couleur
de l'ancienne palette restante hors codes sémantiques, wordmark rendu net à 26px (nav)
et 16px (favicon), fallback grec des titres vérifié sur /el.
