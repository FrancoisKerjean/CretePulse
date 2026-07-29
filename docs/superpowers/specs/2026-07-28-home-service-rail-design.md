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

1. **Outils d'abord, services en second rideau.** On ne déplace ni le board
   départs, ni les blocs météo, baignade et outils. Le rail s'insère entre le
   board départs et « L'île, maintenant ».
2. **Variante V1 « hiérarchie »** : un bandeau photo pleine largeur pour la
   voiture (format prouvé), suivi d'une rangée de trois cartes de poids égal
   (van, activités, villa).
3. **Villa câblée sous feature-flag, éteinte au départ.** Le code part avec la
   home v2, le bloc reste masqué tant que `/stays` n'est pas mergé, indexable et
   pourvu d'au moins une annonce réelle publiée. Ne contredit pas la décision du
   25/07 (`src/app/[locale]/stays/metadata.ts`).
4. **Bloc News + Guides dégonflé** : 6 actualités → 4, 4 guides → 2, les
   événements quittent la home.
5. **Hero « baromètre de l'île »** : les chips météo redondantes cèdent la place
   à trois indicateurs observés, plus un emplacement éteint pour le compteur de
   touristes présents.
6. **Le capteur vols HER est réparé après ce chantier**, dans un chantier dédié.
   Owner Claude, butoir 04/08/2026.

## 4. Structure de la home v2

```
HERO (refondu : baromètre de l'île)
DepBoard (inchangé)
► RAIL « Réserver en direct »          ← nouveau
L'île, maintenant (inchangé)
Où se baigner aujourd'hui (inchangé)
Les outils (inchangé)
Actus & guides (dégonflé)
Newsletter (inchangé)
```

## 4bis. Hero « baromètre de l'île »

### Ce qui ne va pas dans le hero actuel

- **Redondance** : les chips air, mer et vent affichent une ville, et le bloc
  « L'île, maintenant » situé un scroll plus bas affiche la même chose pour
  quatre villes.
- **Il ne dit pas ce que le site fait** : trois chips météo et un lien carte.
- **Sur mobile la carte passe sous la ligne de flottaison** alors qu'elle capte
  34 % des clics de la page, et 73,5 % du trafic est mobile.

### Contenu retenu

Un panneau blanc translucide sous le titre, trois lignes plus une éteinte. Chaque
ligne porte sa source en petit, à droite, masquée sous 640 px.

| Ligne | Contenu | Source | Robustesse |
|---|---|---|---|
| Mer et vent | température de l'eau, vent, air | stations météo | live, déjà en place |
| Croisière | « Jusqu'à N croisiéristes à Héraklion aujourd'hui » + navire et créneau | `flux_cruise_calls`, PDF officiel du port | planifié, 139 escales jusqu'au 31/12 |
| Bus | « N bus suivis en direct » | `flux_bus_positions`, GPS réseaux urbains | live, 5 min |
| Touristes présents | emplacement réservé, **éteint** | `v_flux_stock_daily` | capteur cassé |

### Règles de vérité, non négociables

- **Aucune estimation affichée.** Les trois lignes actives sont des faits
  observés ou planifiés. Le mot « estimation » n'apparaît pas parce qu'il n'y a
  rien d'estimé.
- Le chiffre croisière est une **capacité de navire**, pas un comptage de
  passagers. Le libellé dit donc « jusqu'à N », jamais « N croisiéristes ».
- **La nuit, la ligne bus disparaît** au lieu d'afficher zéro : les réseaux
  urbains ne roulent pas et les crons GPS tournent de 4h à 20h UTC. Règle :
  masquer si le comptage vaut zéro ou si la donnée la plus récente a plus de
  15 minutes. Vérifié le 28/07 à 21:29 UTC : zéro véhicule, aucune position.
- **Aucune ligne ne bloque le rendu.** Si une source ne répond pas, sa ligne
  disparaît ; le hero reste debout avec ce qui est disponible.

### Accès aux données

La home est en ISR `revalidate = 7200`. Y injecter des données live côté serveur
les rendrait périmées de deux heures et multiplierait les écritures ISR, poste
déjà surveillé sur la facture Vercel. Le baromètre est donc un composant client
qui interroge une route dédiée.

Route `GET /api/island-now`, `Cache-Control: s-maxage=600, stale-while-revalidate=1800`.

```ts
{
  cruise: { port: string; paxCapacity: number;
            ships: { name: string; eta: string | null; etd: string | null }[] } | null,
  buses:  { tracked: number; asOf: string } | null,
  stock:  null   // reste null tant que le capteur vols n'est pas repare
}
```

La ligne mer et vent **ne passe pas par cette route** : la météo bouge lentement
et la home la reçoit déjà en props côté serveur (`cities`, `swimPick`). Deux
heures de fraîcheur suffisent pour une température d'eau, et cela retire une
source d'échec au hero. Seules les données réellement volatiles ou absentes du
rendu serveur transitent par l'API.

Vérifié le 28/07 : les tables `flux_cruise_calls`, `flux_bus_positions` et
`v_flux_stock_daily` **refusent le rôle anonyme** (`42501 permission denied`).
La route s'exécute donc côté serveur avec `SUPABASE_SERVICE_KEY`, déjà présente
en environnement de production, et ne renvoie que des agrégats. Aucun accès
anonyme n'est ouvert, aucune clé ne part au navigateur.

Logique pure isolée dans `src/lib/island-now.ts` (choix de l'escale du jour,
règle de masquage nocturne, mise en forme), testée par
`scripts/check-island-now.mjs` câblé à `npm run check`.

### Conséquence à ne pas oublier

L'aperçu social de la home est une **capture d'écran du hero**
(`scripts/capture-og-home.mjs` produit `og-home.jpg` et `og-home-fr.jpg`).
Refondre le hero périme ces images : elles doivent être régénérées dans le même
chantier, sinon les partages Facebook et WhatsApp montrent l'ancienne home.

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

**Piège opérationnel, à connaître avant de compter dessus.** Changer la valeur
dans le tableau de bord Vercel ne suffit pas à allumer le bloc. Les variables
d'environnement sont figées dans l'image de chaque déploiement : la nouvelle
valeur ne prend effet qu'au **déploiement suivant**, pas à la prochaine
régénération ISR. Comme la promotion vers la production est automatique une fois
par jour à 20h Athènes, le délai réel entre le basculement du flag et son effet
visible est **jusqu'à 24 heures**, pas les 2 heures que la durée de cache
laisserait supposer. Pour un allumage immédiat, il faut redéployer.

## 6. Internationalisation

22 locales dans `src/messages/*.json`, namespace `home` (62 clés en français
aujourd'hui). Clés ajoutées :

- `serviceRail.title`, `serviceRail.lead`
- `serviceRail.van.{kicker,title,sub,cta}`
- `serviceRail.activities.{kicker,title,sub,cta}`
- `serviceRail.stays.{kicker,title,sub,cta}`
- `barometer.sea` : « {temp}° dans l'eau, vent {wind} km/h, air {air}° »
- `barometer.cruise` : « Jusqu'à {pax} croisiéristes à {port} aujourd'hui »
- `barometer.buses` : « {count} bus suivis en direct »
- `barometer.src.{weather,port,gps}` : libellés de source

Les quatre clés `carRental*` existantes sont réutilisées telles quelles, sans
retraduction. `npm run check:i18n` doit rester vert (22 locales × N clés) et le
contrôle anti-mélange d'alphabets doit passer, y compris sur `ru`, `ar`, `el`,
`ja`, `ko`, `zh`.

### Copy de référence (français, à traduire dans les 21 autres locales)

| Clé | Texte |
|---|---|
| `serviceRail.title` | Réserver en direct |
| `serviceRail.lead` | Des services opérés depuis l'île. Sans intermédiaire international, sans commission cachée. |

> **Corrigé au contrôle visuel du 29/07/2026.** Le lead disait « Quatre services »
> dans les 22 locales alors que le flag villa est éteint en production : la page
> en affichait trois. Une accroche qui compte faux est une accroche qui ment.
> Le numéral est retiré, la copie survit désormais au basculement du flag sans
> retouche i18n.
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
- **La réparation du capteur vols HER.** Chantier dédié, owner Claude, butoir
  04/08/2026. Ce chantier réserve l'emplacement, il ne répare rien.
- La publication du compteur de touristes présents. Décision après deux semaines
  de collecte propre, butoir 18/08/2026.

## 10. Dettes ouvertes

- **Photo van manquante.** Le mockup utilise `public/images/partners/ferry.jpg`
  en placeholder. Owner Kami, butoir 15/08/2026, sinon on part avec `ferry.jpg`
  assumé et la dette est marquée `ABANDONED`.
- **Visuel activités** : `tours.jpg` existe et convient, à valider à l'écran sur
  la maquette finale.

## 11. Vérifications avant `npm run ship`

- `npx tsc --noEmit` vert.
- `npm run check` vert, incluant `check:home-services` et `check:island-now`.
- `GET /api/island-now` répond en local avec les trois lignes, et la ligne bus
  disparaît bien la nuit (test à horaire simulé, pas à 3h du matin).
- `og-home.jpg` et `og-home-fr.jpg` régénérés via `scripts/capture-og-home.mjs`.
- `npm run check:i18n` vert sur les 22 locales, contrôle d'alphabets inclus.
- `npm run check:da` sans nouvelle violation.
- `npm run build` vert.
- Rendu vérifié à l'écran en desktop et en 390 px de large, flag villa dans les
  deux positions.
