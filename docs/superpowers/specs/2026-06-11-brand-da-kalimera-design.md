# Design — Direction artistique « Kalimera » (identité de marque crete.direct)

Date : 11/06/2026. Validée par Kami sur mockups itérés (v1 almanach → v6 finale, 7 itérations
+ planche typo). Mockup de référence : `ui-da-v6-final.html` / `.png` (racine repo, non commité —
à archiver dans `docs/design/` au build). Recherche fondatrice : Flighty (Apple Design Award,
status board sémantique), Citymapper (couleur unique possédée), tendances 2026 (Figma/Fireart :
typo-architecture, color blocking), Ace Hotel Athens (modernisme grec).

## Le brief de Kami (verbatim condensé)

« Moderne, style arrondi, aux couleurs de la Crète, avec des références à la Crète qu'on
comprenne tout de suite où on est. Transmettre une ambiance de voyage, de Crète, d'outil,
de joie. Pas de police déjà vue. » Et la synthèse finale de Kami : **« on fait un peu une
ambiance Waze »** — l'étoile polaire d'expérience : l'utilitaire compagnon joyeux, rond,
vivant, qui te parle (données live rendues ludiques, pins expressifs, micro-copy complice,
couleurs franches). Toute décision UI future se teste contre ça : « est-ce que Waze le
ferait comme ça ? »

## Identité

### Wordmark dessiné (notre « propre police »)
Lettrage « cretedirect » monoline ronde tracé en SVG paths (pas une fonte) :
- **c initial en spirale** (le mark minoen devient lettre, turquoise foncé)
- **point du i en soleil rayonnant** jaune
- **vague turquoise** soulignant « direct »
Versions : fond clair (encre #0B3954), fond nuit (crème), compacte « c+soleil » pour favicon.
Source dans le mockup `ui-typo-trial.html`. Remplace le texte « CRETE ◉ DIRECT » partout
(header, footer, OG, favicon). Le CiMark spirale reste pour les usages icône seuls.

### Typographie — Baloo 2 VOIX UNIQUE (décision Kami 11/06, 2e planche)
- **Baloo 2** (Google Fonts, 600/700/800) porte TOUT : titres, UI forte, et **toutes les
  données chiffrées** (horaires, températures, prix — `font-variant-numeric: tabular-nums`).
  Le Geist Mono est SUPPRIMÉ du système (« trop austère » — Kami) : `--font-data` est
  remappé sur Baloo 2 + tabular-nums (les composants existants n'ont pas à changer de classe).
- **Geist** reste pour le corps de texte courant (paragraphes, descriptions longues).
- ⚠️ Baloo 2 couvre latin/latin-ext + devanagari, PAS le grec/cyrillique/arabe/CJK →
  stack fallback : `"Baloo 2", "Comfortaa", system-ui` (Comfortaa : grec+cyrillique, ronde).

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

## Système d'images (décision Kami 11/06, planche round 2 : « on ne dessine pas »)
Les styles d'illustration figuratifs (découpes, ligne continue, aplats EOT) sont REJETÉS —
la Crète réelle bat tout dessin, et 18,4K photos réelles existent (cb_places +
media.crete.direct).
- **C — Photo traitée = le style** : partout où une photo existe. Traitement signature
  uniforme : voile dégradé `rgba(lagoon .06) → transparent → rgba(night .42)` en pied,
  `saturate(1.08)`, grain fin (feTurbulence overlay ~.35), coins du conteneur arrondis,
  badge rond Baloo par-dessus. Remplace le voile « aegean multiply » de CardThumb.
- **D — Abstraction lumineuse** : pour les vrais vides (guides sans image, 404, fonds de
  section) : compositions de radial-gradients organiques (soleil/eau pour mer, terracotta/
  olive/sable pour terre) + grain. Rien de figuratif, déclinables par catégorie. Remplace
  les fallbacks gradient linéaires actuels.
- Les **icônes monoline** (icons.tsx) restent la seule écriture dessinée du site.

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
