# Design — Barre d'alerte service repliable (`ServiceAlertBar`)

Date : 2026-06-15
Statut : design validé par Kami (pattern « barre fine repliable »), prêt pour `writing-plans`.
Périmètre : crete.direct (`cretepulse-build`), pages bus.

## 1. Problème

Le bandeau d'alerte service KTEL est une **grosse boîte ambre** toujours dépliée
(`rounded-[20px] border bg-amber-50 px-5 py-4 mb-6` ≈ 140px de haut). Il s'affiche en
haut de `/buses` **et** de **chaque** page de trajet `/buses/[pair]` (il y en a beaucoup),
ce qui pousse l'horaire et le planner loin sous la ligne de flottaison. Retour Kami :
« le bandeau prend beaucoup trop de place partout sur le site ».

De plus le markup est **dupliqué** dans deux composants distincts :
- `BusAlertsBanner` (fonction interne de `src/app/[locale]/buses/BusesClient.tsx`, variante « globale » sur `/buses`).
- `src/components/RouteAlertBanner.tsx` (variante « par trajet » sur `/buses/[pair]`, filtrée par `matched_routes`).

## 2. Objectifs / non-objectifs

**Objectifs**
- Réduire l'encombrement vertical : passer d'une boîte ~140px à une **barre d'une ligne ~40px**, repliée par défaut.
- Le détail (date, titre, lien vers l'avis officiel KTEL, ligne source) reste accessible **en un clic**.
- **Un seul composant** réutilisable pour les deux emplacements (suppression de la duplication).
- Zéro perte SEO ; accessibilité clavier ; cohérence DA crete.direct.

**Non-objectifs (YAGNI)**
- Pas de fermeture mémorisée (« dismissible »), pas de persistance localStorage : l'option repliable a été retenue précisément pour que l'utilisateur revoie toujours qu'une alerte existe.
- Pas de barre collante (sticky), pas de ticker/rotation.
- Aucun changement au pipeline de données d'alertes (`src/lib/bus-alerts.ts` inchangé) ni au système de push (`PushBell`).
- Pas de système d'alerte global hors pages bus.
- Pas de refonte de la palette (on garde l'ambre).

## 3. Décisions validées (Kami)

| Décision | Choix retenu |
|---|---|
| Pattern | **Barre fine repliable** (1 ligne par défaut, déplie au clic). |
| État par défaut | **Replié partout**, y compris page de trajet (la ligne repliée porte déjà le contexte). |
| Couleur | **Ambre** conservé (signal « avertissement » universel, adapté à une info sécurité). |
| Position | **Inline** (en haut du contenu, là où le bandeau est aujourd'hui ; pas sticky). |

## 4. Composant : `ServiceAlertBar`

Nouveau fichier `src/components/ServiceAlertBar.tsx`, **client component** (`"use client"`,
nécessaire pour le toggle d'ouverture). Remplace `BusAlertsBanner` et `RouteAlertBanner`.

### Interface

```ts
type ServiceAlertBarProps = {
  alerts: BusAlert[];          // type importé de "@/lib/bus-alerts"
  locale: string;              // en | fr | de | el (+ fallback en)
  variant: "global" | "route"; // change uniquement le libellé titre/source
};
```

- `alerts.length === 0` → `return null` (comportement actuel préservé).
- `variant` ne pilote QUE le texte de la **ligne source** (attribution KTEL, cf table i18n). Structure et comportement sont par ailleurs identiques. La ligne repliée fait office d'en-tête : aucun titre n'est répété au dépliage.

### Comportement

**Replié (état initial, `open = false`)** — une seule ligne cliquable :
`⚠  {résumé}                                   ⌄`

Règle du `{résumé}` (compact, porte l'essentiel) :
- 1 alerte avec `matched_routes` → `{labelAlerte} · {matched_routes.join(" · ")}`
- 1 alerte sans `matched_routes` → `{labelAlerte} · {title}` (tronqué via `line-clamp-1`)
- N alertes (cas fréquent sur `/buses`) → `{n} {labelAlertes} · {voir}`

**Déplié (`open = true`, après clic)** — sous la ligne, le détail actuel :
- liste `<ul>` des alertes : `[date]` + titre, lien `href={a.url}` (`target="_blank" rel="nofollow noopener"`) + icône `ExternalLink`.
- ligne source en bas (`{source}`, dépend de `variant`).
- Le chevron pivote (`⌄` → `⌃`).

**État** : `const [open, setOpen] = useState(false)`. Local, non persté ; se replie à chaque
navigation (souhaité). Pas de prop `defaultOpen` (YAGNI).

### SEO (point critique)

Le bloc détail est **toujours rendu dans le DOM** (présent dans le HTML SSR), seulement
**masqué visuellement** quand `open === false` — via `hidden`/`max-h-0 overflow-hidden`,
**jamais** via `{open && <detail/>}` (qui l'omettrait du SSR). C'est exactement le pattern
déjà documenté dans `BusesClient.tsx` pour `hideAfter` (« display:none mais HTML présent →
zéro perte de maillage SEO »). Les liens `a.url` vers les avis officiels restent donc
crawlables.

### Accessibilité

- La ligne repliée est un vrai `<button type="button">` (pleine largeur, `text-left`).
- `aria-expanded={open}`, `aria-controls={detailId}` ; le conteneur détail porte `id={detailId}` (via `useId()`).
- `aria-label` du bouton = libellé « Afficher/Réduire le détail de l'alerte » (réutiliser la logique des clés existantes `showAll`/`showLess`).
- Focus visible (anneau), navigable au clavier (Entrée/Espace natifs du `<button>`).

### Style (DA + ambre, version mince)

- Wrapper : `mb-6` (conserve l'espacement sous le bandeau).
- Barre repliée : `flex items-center gap-2 w-full rounded-[14px] border border-amber-300 bg-amber-50 px-4 py-2.5`.
- Icône : `TriangleAlert` `w-4 h-4 text-amber-700 shrink-0`.
- Résumé : `text-sm font-semibold text-amber-900 line-clamp-1`.
- Chevron : `ChevronDown w-4 h-4 text-amber-700 ml-auto transition-transform` (rotation 180° quand `open`).
- Détail : `<ul className="space-y-2 ... pt-3">` + ligne source `text-[11px] text-amber-700`.
- Ouverture : transition douce hauteur/opacité (~200ms) ; respecter `prefers-reduced-motion` (pas d'animation si réduit).

### i18n

Table interne au composant, couvrant **en/fr/de/el avec fallback EN** (même convention que
les call sites actuels). Clés nécessaires :

| Clé | en | fr | de | el |
|---|---|---|---|---|
| `labelAlerte` (1) | Service alert | Alerte service | Betriebsmeldung | Ειδοποίηση |
| `labelAlertes` (N) | service alerts | alertes service | Betriebsmeldungen | ειδοποιήσεις |
| `voir` | view | voir | ansehen | προβολή |
| source `route` | Click to read the official notice before travelling. | Cliquez pour lire l'avis officiel avant de partir. | Vor der Reise den offiziellen Hinweis lesen. | Διαβάστε την επίσημη ανακοίνωση πριν ταξιδέψετε. |
| source `global` | From KTEL Heraklion-Lasithi announcements. Click to read the official notice before travelling. | Annonces KTEL Héraklion-Lassithi. Cliquez pour lire l'avis officiel avant de partir. | Meldungen von KTEL Heraklion-Lasithi. Vor der Fahrt die offizielle Mitteilung lesen. | Ανακοινώσεις ΚΤΕΛ Ηρακλείου-Λασιθίου. Διαβάστε την επίσημη ανακοίνωση πριν ταξιδέψετε. |

Les libellés `source` sont repris à l'identique des composants existants. Le label `labelAlerte`/`labelAlertes` + le résumé replié sont la seule microcopie nouvelle (les titres complets « sur ce trajet » / « · KTEL Est » des composants actuels sont remplacés par la ligne-résumé, plus informative).

## 5. Fichiers touchés

1. **NOUVEAU** `src/components/ServiceAlertBar.tsx` — le composant unifié décrit ci-dessus.
2. **MODIF** `src/app/[locale]/buses/BusesClient.tsx` :
   - Supprimer la fonction `BusAlertsBanner` (≈ l.184-217) et son usage `<BusAlertsBanner … />` (l.439) → `<ServiceAlertBar alerts={alerts} locale={locale} variant="global" />`.
   - Retirer les clés `alertsTitle`/`alertsSource` désormais inutilisées du dictionnaire local (déplacées dans le composant). Vérifier l'import `TriangleAlert` (peut devenir inutile dans ce fichier).
3. **MODIF** `src/app/[locale]/buses/[pair]/page.tsx` :
   - Remplacer `import { RouteAlertBanner } from "@/components/RouteAlertBanner"` par `import { ServiceAlertBar } from "@/components/ServiceAlertBar"`.
   - Remplacer `<RouteAlertBanner alerts={routeAlerts} locale={ui} />` (l.330) par `<ServiceAlertBar alerts={routeAlerts} locale={ui} variant="route" />`.
   - (Le composant client s'imbrique sans souci dans cette page Server Component — îlot client classique.)
4. **SUPPRESSION** `src/components/RouteAlertBanner.tsx` (remplacé).

Aucune modification de `src/lib/bus-alerts.ts`, des pages au-delà des bus, ni du pipeline d'alertes.

## 6. Tests & vérification

- **Gate repo (NON négociable)** : `tsc` propre + `next build` OK avant tout push (Vercel ne sert jamais un build cassé).
- **Vérif fonctionnelle (Playwright)**, en s'appuyant sur l'alerte live actuelle (id 31, fermeture Neapoli–Agios Nikolaos) :
  1. Charger `/en/buses/agios-nikolaos-to-heraklion` → la barre est **repliée** par défaut (détail non visible), hauteur ~40px.
  2. Cliquer la barre → le détail apparaît (titre + lien avis officiel), chevron pivoté, `aria-expanded=true`.
  3. Charger `/en/buses` → barre repliée, résumé cohérent (1 alerte → contexte ; N → compte).
- **Vérif SEO** : le HTML SSR initial (view-source / `curl`) **contient** le titre de l'alerte et le lien `a.url` même barre repliée (détail dans le DOM, masqué CSS).
- **a11y** : navigation clavier (focus sur la barre, Entrée déplie), `aria-expanded` bascule.

## 7. Livraison (rappel conventions repo)

Branche dédiée `feat/service-alert-bar` partant de `master` (jamais sur `main`, ni
directement sur `master`). Stage explicite des fichiers (`git add -A` interdit). Preview
Vercel via push de la branche pour valider hors prod, puis merge `master` → déploiement
prod par `git push origin master:main` (acte conscient). Auteur git = kerjeanfrancois29.

Ce spec reste **untracked** sur la branche courante jusqu'à la création du worktree dédié
(convention multi-terminal du repo) ; il sera committé dans `feat/service-alert-bar` au
moment du plan/implémentation.
