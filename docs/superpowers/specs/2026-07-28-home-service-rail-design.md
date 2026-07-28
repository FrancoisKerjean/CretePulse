# Home v2 crete.direct : rail « Réserver en direct »

**Date :** 2026-07-28
**Statut :** Design validé par Kami, prêt pour plan d'implémentation
**Branche :** `feat/home-service-rail` · worktree `C:\Users\fkerj\cp-home-rail`
**Mockup :** `docs/mockups/2026-07-28-home-v2-services.html` (3 variantes, toggle mobile, toggle flag villa)

## 1. Objectif

Exposer sur la home les quatre services opérés par crete.direct (voiture, van
partagé, activités, villa) dans un bloc unique placé haut, sans dégrader le
trafic vers les outils qui font vivre le site, et en rendant chaque service
mesurable séparément.

## 2. Constat mesuré (Plausible ClickHouse `events_v2`, site_id=1, 30 jours au 28/07/2026)

| Fait | Valeur |
|---|---|
| Home (toutes locales) | 2 083 pageviews, 1 247 sessions |
| Part du site | 5,5 % des pageviews (37 550) et des sessions (22 489) |
| Mobile | 73,5 % |
| Rang en page d'entrée | 3ᵉ (793 sessions) derrière `/en/explore` (2 259) et `/en/buses` (1 117) |
| Rebond home | 25 % (313 sessions à 1 page) ; 45 % font 4 pages ou plus |

Clics sortants depuis la home, toutes locales confondues :

| Destination | Clics | Part |
|---|---|---|
| `/explore` | 372 | 34 % |
| `/buses` | 197 | 18 % |
| `/beaches` + `/beaches/today` | 174 | 16 % |
| `/car-rental` (le bandeau photo) | 71 | 6,5 % |
| `/search` | 58 | 5 % |
| `/news` + `/articles` | 46 | 4 % |
| `/weather` | 36 | 3 % |
| `/airbnb`, `/events`, `/villages` | 39 | 3,5 % |

Trois conclusions qui pilotent ce design :

1. **Le bandeau photo pleine largeur est le seul format commercial prouvé** de la
   page : 71 clics pour 1 247 sessions, soit 5,7 % de taux de clic avec un seul
   bloc. C'est le format à répliquer, pas à remplacer.
2. **Le bloc News + Guides + Événements coûte cher** : environ 40 % de la hauteur
   de page pour 4 % des clics.
3. **Les trois autres services sont invisibles** : `/activities` totalise
   **20 pageviews en 30 jours sur tout le site** (aucun lien dans la nav, aucun
   sur la home), `/where-to-stay` 20, `/property-management` 1. Le van n'apparaît
   que via `VanPromo` sur les pages trajet. Leur faible volume ne mesure pas un
   désintérêt, il mesure une absence d'exposition.

## 3. Décisions verrouillées avec Kami (28/07/2026)

1. **Outils d'abord, services en second rideau.** On ne déplace ni le hero, ni le
   board départs, ni les blocs météo, baignade et outils. Le rail s'insère entre
   le board départs et « L'île, maintenant ».
2. **Variante V1 « hiérarchie »** : un bandeau photo pleine largeur pour la
   voiture (format prouvé), suivi d'une rangée de trois cartes de poids égal
   (van, activités, villa).
3. **Villa câblée sous feature-flag, éteinte au départ.** Le code part avec la
   home v2, le bloc reste masqué tant que `/stays` n'est pas mergé, indexable et
   pourvu d'au moins une annonce réelle publiée. Ne contredit pas la décision du
   25/07 (`src/app/[locale]/stays/metadata.ts`).
4. **Bloc News + Guides dégonflé** : 6 actualités → 4, 4 guides → 2, les
   événements quittent la home.

## 4. Structure de la home v2

```
HERO (inchangé)
DepBoard (inchangé)
► RAIL « Réserver en direct »          ← nouveau
L'île, maintenant (inchangé)
Où se baigner aujourd'hui (inchangé)
Les outils (inchangé)
Actus & guides (dégonflé)
Newsletter (inchangé)
```

## 5. Composants et données

### 5.1 `src/lib/home-services.ts` : module pur

Aucun accès réseau, aucun JSX. Expose le catalogue et la règle de visibilité.

```ts
export type HomeServiceId = "car" | "van" | "activities" | "stays";

export interface HomeService {
  id: HomeServiceId;
  href: string;          // interne ("/car-rental") ou absolu (van)
  external: boolean;     // dérivé de href, pas saisi à la main
  photo: string;         // chemin public/
  layout: "band" | "card";
}

export function getHomeServices(opts: { staysEnabled: boolean }): HomeService[];
```

Règles : `car` a toujours `layout: "band"` et arrive en premier ; `van` et
`activities` sont en `card` ; `stays` n'est présent dans le tableau retourné que
si `staysEnabled` vaut `true`. `external` vaut `true` uniquement pour le van
(`https://van.crete.direct`).

Tests purs dans `scripts/check-home-services.mjs`, câblé à `npm run check`
(pattern `check:car-quotes`, `check:retention`) : ordre stable, flag off retire
exactement une entrée, flag on en rend quatre, `external` correct, aucun `href`
vide, chaque `photo` pointe un fichier existant de `public/`.

### 5.2 `src/components/home/ServiceRail.tsx` : présentation

Consomme `HomeService[]` et le namespace i18n `home`. Reprend le langage visuel
du bandeau car-rental existant (photo plein bloc, scrim dégradé, pastille
kicker, titre, sous-titre, pastille CTA blanche). Trois cartes en grille
`grid-cols-3` sur desktop, empilées sur mobile.

Le lien van est un `<a>` avec `rel="noopener"` et `target="_blank"` ; les trois
autres passent par le `Link` de `@/i18n/navigation` pour conserver la locale.

### 5.3 Feature-flag villa

Lecture serveur dans `src/app/[locale]/page.tsx` :

```ts
const staysEnabled = process.env.STAYS_HOME_BLOCK === "on";
```

Variable **non** préfixée `NEXT_PUBLIC_` : elle est lue côté serveur et le
résultat descend en prop. Absente ou différente de `"on"` = bloc masqué. Défaut
en production au lancement : absente, donc trois services affichés.

## 6. Internationalisation

22 locales dans `src/messages/*.json`, namespace `home` (62 clés en français
aujourd'hui). Clés ajoutées :

- `serviceRail.title`, `serviceRail.lead`
- `serviceRail.van.{kicker,title,sub,cta}`
- `serviceRail.activities.{kicker,title,sub,cta}`
- `serviceRail.stays.{kicker,title,sub,cta}`

Les quatre clés `carRental*` existantes sont réutilisées telles quelles, sans
retraduction. `npm run check:i18n` doit rester vert (22 locales × N clés) et le
contrôle anti-mélange d'alphabets doit passer, y compris sur `ru`, `ar`, `el`,
`ja`, `ko`, `zh`.

### Copy de référence (français, à traduire dans les 21 autres locales)

| Clé | Texte |
|---|---|
| `serviceRail.title` | Réserver en direct |
| `serviceRail.lead` | Quatre services opérés depuis l'île. Sans intermédiaire international, sans commission cachée. |
| `van.kicker` | Van partagé |
| `van.title` | Aéroport vers ville |
| `van.sub` | Dès 40 € le siège, sur les trajets que le bus ne fait pas. |
| `van.cta` | Voir les trajets |
| `activities.kicker` | Activités |
| `activities.title` | Randonnée, bateau, cuisine |
| `activities.sub` | Plusieurs prestataires chiffrent votre demande. |
| `activities.cta` | Demander un devis |
| `stays.kicker` | Villa et maison |
| `stays.title` | Louez sans Airbnb |
| `stays.sub` | Le propriétaire fixe son prix, vous payez 5 % de frais au lieu d'environ 14 %. |
| `stays.cta` | Voir les logements |

Contraintes de copy : aucun tiret cadratin (`check:da`), aucune garantie de
revenu ni de disponibilité, aucun chiffre inventé. Les deux chiffres cités sont
sourcés : 40 €/siège est le tarif réel du booking van `id=6` du 27/07 ; le 5 %
contre environ 14 % vient de la spec Stays du 24/07. Le nombre d'activités n'est
pas affiché : il bouge, et l'afficher créerait une dette de synchronisation.

## 7. Instrumentation et mesure

Sans instrumentation, ce chantier n'est pas évaluable. Deux événements :

- `promo_impression` avec `block: "service-rail"`, `source: "home"`,
  `service: <id>` , via le `ImpressionTracker` existant, un par bloc.
- `service_rail_click` avec `service: <id>` et `layout: "band" | "card"`, au
  clic, avant la navigation.

**Baseline à battre** (30 jours avant bascule) : 71 clics `/car-rental` depuis la
home, 0 clic van, 0 clic activités, 5,7 % de taux de clic du bloc commercial.

**Relevé J+14** après la mise en production, owner Claude : taux de clic du rail
entier, répartition par service, et contrôle de non-régression sur
`/explore`, `/buses` et `/beaches` depuis la home. Seuil d'alerte : si les clics
vers ces trois destinations baissent de plus de 15 % en part relative, le rail
descend sous « Où se baigner » sans autre changement.

## 8. Dégonflage du bloc Actus et guides

`latestNews.slice(0, 6)` → `slice(0, 4)`, `latestGuides.slice(0, 4)` →
`slice(0, 2)`, retrait du sous-bloc « Prochains événements » de la home. Le lien
« Tout voir » vers `/events` reste dans le footer, déjà présent. Coût SEO estimé
faible : ces pages sont atteintes par le sitemap et la nav, et la home ne pèse
que 5,5 % du trafic.

## 9. Hors scope

- La refonte de `/activities` elle-même. Le rail lui envoie du trafic, il ne
  répare pas la page.
- Le merge, l'indexation et la mise en ligne de `feat/stays-marketplace`. Ce
  chantier prépare l'emplacement, il ne lève pas le gel du 25/07.
- L'ajout d'entrées dans la nav du header. À traiter séparément, une fois qu'on
  saura ce que le rail produit.
- La `MobileTabBar` : quatre onglets aujourd'hui, elle n'est pas touchée.

## 10. Dettes ouvertes

- **Photo van manquante.** Le mockup utilise `public/images/partners/ferry.jpg`
  en placeholder. Owner Kami, butoir 15/08/2026, sinon on part avec `ferry.jpg`
  assumé et la dette est marquée `ABANDONED`.
- **Visuel activités** : `tours.jpg` existe et convient, à valider à l'écran sur
  la maquette finale.

## 11. Vérifications avant `npm run ship`

- `npx tsc --noEmit` vert.
- `npm run check` vert, incluant le nouveau `check:home-services`.
- `npm run check:i18n` vert sur les 22 locales, contrôle d'alphabets inclus.
- `npm run check:da` sans nouvelle violation.
- `npm run build` vert.
- Rendu vérifié à l'écran en desktop et en 390 px de large, flag villa dans les
  deux positions.
