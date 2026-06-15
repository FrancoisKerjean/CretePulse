# Board « Prochains bus » : rangées cliquables vers la page de ligne

- Date : 2026-06-15
- Statut : design validé (Kami, 2026-06-15), en attente de revue du spec écrit
- Périmètre : board bus uniquement (pas de finitions météo)
- Fichier touché : `src/components/DepBoard.tsx` (un seul)

## Contexte

Le board « Prochains bus » de la page d'accueil (`DepBoard.tsx`, rendu par
`HomeClient.tsx` sous le hero) affiche les N prochains départs toutes lignes
confondues. Chaque rangée montre `from · to`, l'heure, un badge (« dans X min »
/ « dernier du jour » / « demain ») et le prix.

Aujourd'hui chaque rangée est un `<div>` non interactif. Le seul lien du bloc
est le bouton « Planifier un trajet » en haut à droite, qui mène à `/buses`
(le planificateur générique). Une rangée ressemble à un résultat cliquable mais
ne mène nulle part : c'est l'incohérence de cliquabilité signalée.

## Problème

Un visiteur qui voit « Heraklion · Chania, prochain à 14:30, dans 20 min » veut,
en tapant cette rangée, en voir plus sur CETTE ligne (horaires complets, prix,
durée, prochains départs). Le clic n'est pas possible. Le tap atterrit dans le
vide.

## Objectif

Rendre chaque rangée du board cliquable vers la page dédiée de la ligne
`/buses/[pair]`, avec une affordance visuelle claire (le visiteur comprend que
c'est tappable) et sans rien casser du calcul/affichage existant.

## Non-objectifs (hors périmètre)

- Pastilles météo du hero (air/mer/vent) : restent non cliquables.
- Tuiles ville « L'île, maintenant » : restent vers `/weather` générique.
- Aucun changement du moteur de départs, du tri, du dedup, du style des
  heures/badges/prix, ni du bouton « Planifier un trajet ».
- Pas de nouvelle route, pas de migration, pas de changement de données.

## Cible de navigation : `/buses/[pair]` (décision Kami)

Chaque rangée pointe vers la page de ligne pré-rendue, ex.
`/buses/chania-to-heraklion`. Cette page (`src/app/[locale]/buses/[pair]/page.tsx`)
affiche déjà : horaires des deux sens, prix, durée, prochain départ
(`NextDeparture`), comparatif taxi/voiture, FAQ et un CTA « Planifier ce trajet
avec une date » vers le planificateur. C'est le meilleur point d'atterrissage :
instantané (pré-rendu, `revalidate=86400`), riche, bon pour le SEO.

Le slug de paire est dérivé par `pairSlug(from, to)` (`@/lib/bus-pairs`). Le
slug est direction-agnostique (ordre alphabétique des slugs), donc le sens exact
A→B de la rangée n'est pas conservé dans l'URL. C'est acceptable : la page
montre les deux sens, et son en-tête affiche `placeA ⇄ placeB`.

### Invariant de validité du slug

Par construction, `page.tsx` (HomePage) ne passe au board (`boardRoutes`) que des
routes dont la paire figure dans `boardPairs`, lui-même construit en filtrant sur
`pairSlug(a, b) !== null`. Donc pour toute rangée affichée,
`pairSlug(d.from, d.to)` est garanti non-null.

Sécurité défensive (belt-and-suspenders) : si jamais le slug est `null`, la
rangée est rendue comme un `<div>` non cliquable (comportement actuel), jamais un
`<Link>` cassé. Aucune rangée ne peut produire de 404.

## Design technique

### 1. Imports ajoutés

```ts
import { pairSlug } from "@/lib/bus-pairs";
import { ChevronRight } from "lucide-react";
```

(`Link` de `@/i18n/navigation` est déjà importé ligne 6 : il préfixe la locale
automatiquement, donc `href="/buses/<slug>"` devient `/fr/buses/<slug>`, etc.)

### 2. Modèle de données : porter le slug dans `NextDep`

Ajouter le champ `pair` à l'interface et le calculer dans la boucle de build
(`useEffect`), aux deux branches (départ d'aujourd'hui et premier bus de demain) :

```ts
interface NextDep {
  from: string; to: string; time: string; inMin: number;
  isLast: boolean; isTomorrow: boolean; price: number | null;
  pair: string | null; // slug /buses/[pair], null si paire indigne (jamais en pratique)
}
```

À chaque `out.push({...})`, ajouter `pair: pairSlug(r.from_place, r.to_place)`.
Le render reste déclaratif (pas de calcul dans le JSX).

### 3. Render : rangée = `<Link>` (toute la rangée cliquable)

Choix tranché : lien sur **toute la rangée**, pas un petit bouton flèche séparé
(tap target large, meilleur au doigt, plus simple, plus accessible).

La grille passe de 4 à 5 colonnes (ajout du chevron) :
`grid-cols-[1fr_auto_auto_auto]` → `grid-cols-[1fr_auto_auto_auto_auto]`.

Pseudo-structure (les colonnes internes — nom, heure, badge, prix — restent
identiques à l'existant) :

```tsx
{deps.map((d) => {
  const rowClass =
    "grid grid-cols-[1fr_auto_auto_auto_auto] gap-5 items-center py-3 " +
    "border-t border-[#EAF7FA]/12";

  const inner = (
    <>
      <span className="font-semibold">{d.from} <span className="text-lagoon mx-1">·</span> {d.to}</span>
      <span className="text-[25px] font-bold">{d.time}</span>
      <span className={/* badge identique à l'actuel */}>…</span>
      <span className="text-right text-[#EAF7FA]/55 text-sm w-16">{d.price != null ? `${d.price.toFixed(2)} €` : ""}</span>
      <ChevronRight className="w-4 h-4 text-[#EAF7FA]/40" aria-hidden />
    </>
  );

  return d.pair ? (
    <Link
      key={`${d.from}-${d.to}`}
      href={`/buses/${d.pair}`}
      aria-label={T.routeAria[ui](d.from, d.to)}
      onClick={() => trackRouteClick(d.pair!)}
      className={`${rowClass} -mx-2 px-2 rounded-lg transition-colors hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lagoon/60`}
    >
      {inner}
    </Link>
  ) : (
    <div key={`${d.from}-${d.to}`} className={rowClass}>
      {inner}
    </div>
  );
})}
```

Notes :
- `-mx-2 px-2 rounded-lg` : étend très légèrement (8px) le fond de survol/focus
  pour un effet « pilule » contenu sans casser l'alignement. Valeurs exactes
  ajustables à l'impl (test visuel).
- Le chevron est persistant (faible opacité), pas seulement au survol : essentiel
  sur mobile où il n'y a pas de hover pour signaler la cliquabilité.
- `transition-colors` pour un survol doux, cohérent avec le reste du site.

### 4. Accessibilité

- `aria-label` localisé par rangée décrivant la destination, ex.
  « Horaires Heraklion – Chania ». Nouvelle entrée i18n `routeAria` (4 langues +
  fallback EN, pattern du composant).
- `focus-visible:ring` lagon pour la navigation clavier.
- Chevron en `aria-hidden` (décoratif, l'aria-label porte déjà le sens).

Nouvelle entrée à ajouter dans l'objet `T` :

```ts
routeAria: {
  en: (a: string, b: string) => `Timetable ${a} – ${b}`,
  fr: (a: string, b: string) => `Horaires ${a} – ${b}`,
  de: (a: string, b: string) => `Fahrplan ${a} – ${b}`,
  el: (a: string, b: string) => `Δρομολόγια ${a} – ${b}`,
},
```

### 5. Mesure (recommandé, dans le périmètre board)

Au clic, émettre un event Plausible léger `board_route_click` avec la prop
`pair`, selon le pattern déjà utilisé par le site (`BuyTicketCTA`, `bus_search`
dans `JourneyPlanner.tsx`). Objectif : savoir si rendre le board cliquable génère
réellement des sessions bus (lié au suivi de traction).

```ts
function trackRouteClick(pair: string) {
  const plausible = (window as unknown as {
    plausible?: (e: string, o?: { props?: Record<string, string | number> }) => void;
  }).plausible;
  plausible?.("board_route_click", { props: { pair } });
}
```

Non bloquant : si `window.plausible` est absent, le clic navigue normalement.

## Cas limites

| Cas | Comportement |
|-----|--------------|
| Paire indigne (`pairSlug` = null) | Rangée non cliquable (`<div>`), pas de 404. N'arrive pas avec les données actuelles (invariant ci-dessus). |
| `window.plausible` absent | Navigation normale, aucun event. |
| `deps.length === 0` | Le composant retourne déjà `null` (inchangé). |
| Locale non FR/EN/DE/EL | `ui` retombe sur `en` (pattern existant), `routeAria` fallback EN. |
| Clic clavier (Enter) | Le `<Link>` (ancre) navigue nativement ; `onClick` se déclenche aussi → event émis. |

## Vérification

- `tsc` sans erreur sur `DepBoard.tsx`.
- `next build` passe (si lancé).
- Vérif manuelle (preview Vercel d'une branche `feat/*`) :
  1. Survol d'une rangée → fond clair + curseur lien + chevron visible.
  2. Clic « Heraklion · Chania » → atterrit sur `/buses/chania-to-heraklion`
     (slug alphabétique), page de ligne avec horaires.
  3. Navigation clavier : Tab atteint la rangée, anneau de focus visible, Enter
     navigue.
  4. Mobile : tap sur toute la largeur de la rangée fonctionne, chevron visible.
  5. Réseau/console : un event `board_route_click` part au clic (props `pair`).
- Sanity slug : les 6 paires du board
  (Heraklion–Chania, Heraklion–Ierapetra, Chania–Paleochora,
  Heraklion–Agios Nikolaos, Heraklion–Siteia, Ierapetra–Makry Gyalos)
  mappent toutes vers un slug non-null (réutilisable :
  `scripts/check-bus-pairs.mjs`).

## Risque / réversibilité

Risque minimal : un seul fichier, ajout de cliquabilité sur une cible déjà
existante et stable, aucun changement de données ni de logique de calcul.
Réversible en un revert du fichier. Vercel ne sert jamais un build cassé.
