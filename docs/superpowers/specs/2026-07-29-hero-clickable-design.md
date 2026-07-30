# Hero cliquable — design

Date : 2026-07-29
Statut : validé Kami
Chantier : branche `feat/hero-clickable`, worktree `C:\Users\fkerj\cp-hero-click`

## Problème

Le hero de la home affiche cinq blocs d'information qui appellent une suite, et
aucun n'est cliquable. Le badge « Καλημέρα · date · live », les trois lignes du
baromètre (mer, croisière, bus) et la phrase de la plage du jour sont du texte
mort. Le visiteur lit un fait, veut la suite, et doit repartir chercher l'entrée
correspondante ailleurs dans la page ou dans le menu.

Trois zones seulement sont cliquables aujourd'hui : le CTA jaune, la carte de
Crète et les trois chips sociaux.

## Périmètre

Cinq zones deviennent cliquables :

| Zone | Fichier | Destination |
|---|---|---|
| Badge `Καλημέρα · date · live` | `HomeClient.tsx` | `/live` |
| Phrase plage du jour | `HomeClient.tsx` | `/beaches/<swimPick.slug>` |
| Ligne mer (eau / vent / air) | `IslandBarometer.tsx` | `/weather` |
| Ligne croisière | `IslandBarometer.tsx` | `/villages/<port>`, sinon rien |
| Ligne bus | `IslandBarometer.tsx` | `/live` |

Hors périmètre : le titre `h1` reste non cliquable. Un `h1` qui pointe vers une
autre page depuis sa propre home brouille le repère plus qu'il ne fluidifie.

## Règle de destination

**Chaque zone renvoie vers la page qui prouve son fait.** La ligne mer va vers
`/weather` et non vers la plage du jour : le CTA jaune et la phrase plage y
mènent déjà, trois portes vers la baignade dans un hero de cinq liens n'aide
personne. Le badge va vers `/live` parce qu'il dit « live », pas vers `/daily`
qui est en anglais seul et casserait 21 locales sur 22.

## Repli croisière

Les cinq ports que le baromètre sait nommer n'ont pas tous une page. Mapping :

| Port (`island-now`) | Cible |
|---|---|
| `heraklion` | `/villages/heraklion` |
| `chania` | `/villages/chania` |
| `souda` | `/villages/chania` — Souda est le port de La Canée |
| `agios_nikolaos` | `/villages/agios-nikolaos` |
| `sitia` | aucune, `/villages/sitia` est un 404 vérifié en prod |

**Pas de cible prouvée, pas de lien** : la ligne Sitia reste du texte, comme le
baromètre laisse une ligne absente quand sa source est muette. On n'invente pas
un lien plus qu'on n'invente un chiffre.

## Affordance

Chevron en fin de ligne, après le libellé de source.

- **Pointeur fin** (`@media (hover: hover)`) : chevron invisible au repos,
  révélé au survol avec un léger décalage. Le hero garde son calme.
- **Tactile** : chevron permanent à opacité réduite. Le hover n'existe pas sur
  mobile, où passe l'essentiel du trafic ; sans chevron permanent ces liens
  seraient invisibles là où ils comptent le plus.

Le libellé de source (`météo`, `port`, `GPS`) est déjà `sr-only` sous `sm` : sur
mobile le chevron occupe seul la colonne de droite, il ne charge rien.

## i18n

**Aucune clé nouvelle dans les 22 fichiers de messages.** Le lien enveloppe le
texte déjà traduit, donc le nom accessible du lien vient de la traduction
existante. `check:i18n` reste à 172 clés.

Conséquence assumée sur la phrase plage : c'est la **phrase entière** qui devient
cliquable, pas le seul nom de la plage. Isoler le nom exigerait de baliser la
chaîne interpolée dans les 22 locales, une dette de traduction sans rapport avec
le gain.

## Mesure

Event Plausible `hero_click`, prop `zone` parmi `badge`, `sea`, `cruise`,
`buses`, `swim`. Même patron que `service_rail_click` : appel direct à
`window.plausible?.(...)` dans le `onClick`, aucune dépendance nouvelle.

Vérification au navigateur, jamais à la lecture du code : bloquer
`script.outbound-links.js` puis lire `window.plausible.q`. Espionner
`window.plausible` donne un faux négatif, le script Plausible écrase la fonction.

Baseline : zéro, ces zones n'étaient pas cliquables. Relevé J+14 le 12/08/2026,
en même temps que celui du rail de services, owner Kami.

## Architecture

Un module pur nouveau, `src/lib/hero-links.ts` :

- `cruisePortHref(port: string): string | null` — le mapping ci-dessus, `null`
  pour tout port inconnu ou sans page.
- `swimHref(slug: string): string` — la fiche plage.

Aucune dépendance React, aucun accès réseau, testable hors navigateur, comme
`home-services.ts` et `island-now.ts`. Tests dans `scripts/check-hero-links.mjs`,
câblé dans `npm run check`.

Les deux composants ne font que consommer ce module et poser les liens.

## Ce qui ne change pas

- La doctrine du baromètre : une source muette n'affiche pas de ligne, jamais de
  zéro, jamais d'estimation.
- Le CTA jaune reste sur `/beaches/today`, la carte sur `/explore`, les socials
  vers l'extérieur.
- Le libellé croisière continue de dire « jusqu'à N » : c'est une capacité de
  navire, pas un comptage de passagers.

## Vert avant push

`npm run check` (dont les nouveaux tests `check:hero-links`), `tsc --noEmit`,
`next build` exit 0, plus un contrôle visuel à 390 px et en desktop, et la
vérification des events au navigateur.
