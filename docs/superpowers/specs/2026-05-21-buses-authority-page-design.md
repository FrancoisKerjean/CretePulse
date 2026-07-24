# Spec — Page `/buses` : ressource bus de référence + sas vers les guides

Date : 2026-05-21
Statut : validé en brainstorming, prêt pour plan d'implémentation
Repo : `cretepulse-build` (crete.direct)
Branche : `feat/buses-authority-page`

## 1. Contexte et problème

`/en/buses` est la page la plus visitée de crete.direct (Vercel Analytics, 30 j : `/en/buses` 144 visiteurs + `/de/buses` 36, soit ~1,8× la home). Pourtant :

- Les données sont **10 lignes inter-villes écrites en dur** dans `src/app/[locale]/buses/BusesClient.tsx` (tableau `ROUTES`), couvrant uniquement les 8 grandes villes. Zéro plage, village ou site.
- La page se termine sur un lien sortant gratuit vers `e-ktel.com`. **Rebond global du site : 79 %** : les visiteurs lisent l'horaire et repartent.
- Aucun JSON-LD sur la page (alors que weather / things-to-do / compare en ont).

Le trafic existe ; le système pour le capter et le diffuser n'existe pas.

### Réalité des données (vérifiée le 2026-05-21)

- **Pas d'API publique, pas de GTFS** pour les bus de Crète.
- Deux opérateurs, deux sites :
  - KTEL Heraklion-Lasithi (est) : `https://www.ktelherlas.gr/en/timetables`
  - KTEL Chania-Rethymno (ouest) : `https://www.e-ktel.com/en/services/dromologia`
- Horaires publiés en pages web / PDF, variables selon la saison (été/hiver).

Conséquence : « brancher une API » est impossible. Fabriquer notre propre source de données structurée **est** le différenciant — personne n'a de données bus Crète propres et datées.

## 2. Objectifs et non-objectifs

### Objectifs (validés avec Kami)
1. **Aspirateur SEO + sas vers les guides** : faire ranker `/buses` n°1 sur l'intention bus, puis renvoyer chaque visiteur vers les guides de destination (réduire le rebond, augmenter pages/session).
2. **Ressource bus la plus complète** : données fraîches, datées, exhaustives, y compris vers plages / villages / sites.

### Non-objectifs (YAGNI)
- **Pas de CTA affilié** sur la page (décision Kami). La branche `feat/buses-transport-cta` est abandonnée, jamais mergée.
- **Pas de nouvelles URLs destination** (`/buses/to-chania`) : cannibaliseraient `getting-around/[route]` qui couvre déjà le « X to Y » multimodal. On approfondit la page unique au lieu d'éparpiller.
- Pas de temps réel (position des bus, retards). Cron hebdo suffit, les horaires bougent par saison.
- Pas de réservation / billetterie (on renvoie vers KTEL pour ça).

### Anti-cannibalisation — règle de conception
`getting-around/[route]` est une page programmatique **multimodale** (bus + voiture + taxi + ferry + avion), une URL par trajet, qui vise déjà les requêtes « X to Y ». `/buses` reste **mono-mode bus** et se différencie par : la fraîcheur des données, la couverture bus→plages/villages/sites, et le sas guides. Les deux pages se **lient mutuellement** au lieu de se concurrencer (`/buses` → « comparer voiture/taxi/ferry » → `getting-around`).

## 3. Architecture — 3 briques

### Brique A : pipeline de données (scraper VPS)

- **Script** : `/opt/cretepulse/buses.py` sur le VPS Hetzner, à côté de `news.py` / `weather.py`.
- **Cron** : hebdomadaire (les horaires changent par saison, pas par jour ; ne pas marteler les sites KTEL).
- **Deux parsers, un schéma commun** :
  - parser `ktelherlas` → `https://www.ktelherlas.gr/en/timetables`
  - parser `ektel` → `https://www.e-ktel.com/en/services/dromologia`
- **Normalisation** vers le schéma `bus_routes` (cf. Brique B).
- **Robustesse (non négociable)** :
  - Écriture **transactionnelle** : on ne remplace les données d'un opérateur que si le scrape a réussi et renvoie un nombre de lignes plausible (> seuil minimal). Sinon on **conserve la dernière donnée valide**.
  - Échec ou structure HTML changée → **alerte Telegram** (infra existante) avec l'opérateur concerné. Jamais de page vide ni de périmé silencieux.
  - Chaque ligne porte `scraped_at` → affiché en « Mis à jour le X ».

### Brique B : modèle de données (Postgres `cretepulse-db`, exposé via PostgREST)

Migration SQL dans `supabase/` (même convention que l'existant).

```sql
-- Opérateurs KTEL
create table bus_operators (
  id          text primary key,            -- 'herlas' | 'ektel'
  name        text not null,
  region      text not null,               -- 'east' | 'west'
  source_url  text not null
);

-- Lignes de bus (résultat du scrape)
create table bus_routes (
  id           bigserial primary key,
  operator_id  text references bus_operators(id),
  from_place   text not null,
  to_place     text not null,
  to_slug      text,                        -- FK logique vers bus_destinations.slug
  season       text not null default 'all', -- 'summer' | 'winter' | 'all'
  duration     text,
  price_eur    numeric,                     -- null si inconnu
  frequency    text,
  departures   jsonb,                       -- liste d'heures si dispo
  source_url   text not null,
  scraped_at   timestamptz not null default now()
);
create index on bus_routes (from_place, to_place);
create index on bus_routes (to_slug);

-- Destinations (branche le sas vers les guides + extension plages/villages/sites)
create table bus_destinations (
  slug              text primary key,       -- 'chania', 'elafonissi', 'knossos'
  name              text not null,
  type              text not null,          -- 'town' | 'beach' | 'village' | 'site'
  region            text,
  lat               numeric,
  lng               numeric,
  things_to_do_slug text,                   -- vers /things-to-do/[slug]
  where_to_stay_slug text,                  -- vers /where-to-stay/[slug]
  beaches_near      boolean default false,  -- afficher « plages près de X »
  has_direct_bus    boolean default true    -- false → message « pas de bus direct »
);
```

`bus_destinations` est **curé** (one-shot, on connaît le terrain) ; `bus_routes` est **alimenté par le scraper**. Le lien `to_slug` rattache une ligne scrapée à une destination guidée. Les destinations sans bus direct (`has_direct_bus = false`) restent listées avec un message honnête + lien guide + lien `getting-around`.

### Brique C : rendu de la page

- `src/app/[locale]/buses/page.tsx` (server component, `revalidate` quotidien) lit `bus_routes` + `bus_destinations` via le client PostgREST existant (`NEXT_PUBLIC_SUPABASE_URL`), au lieu du tableau hardcodé.
- `BusesClient.tsx` reçoit les données en props. La barre de recherche from→to et les `RouteCard` existants sont conservés.
- **Carte de ligne enrichie** :
  - badge « Mis à jour le {scraped_at} » (signal de fraîcheur)
  - **sas guides** vers la destination (`to_slug`) : « Que faire à {dest} » + « Où dormir » + « Plages près de {dest} » (liens conditionnés par les champs de `bus_destinations`)
  - lien croisé discret « Comparer voiture / taxi / ferry » → `getting-around/[route]` correspondant
- **Groupement** par région (est Heraklion-Lasithi / ouest Chania-Rethymno), puis par type (villes / plages / sites) à l'intérieur.
- **Destinations sans bus direct** : carte avec message « Pas de bus direct vers {dest} » + lien guide + lien `getting-around` (transforme une absence de donnée en contenu utile).

## 4. SEO

- JSON-LD `@graph` sur `/buses` via un helper `busesPageSchema()` dans `src/lib/schema.ts` (même pattern que `weatherPageSchema()`) :
  - `WebPage` + `BreadcrumbList` localisé
  - `ItemList` des lignes de bus
  - `FAQPage` (questions types : « Y a-t-il des bus la nuit ? », « Comment aller à {plage} en bus ? »)
  - `dateModified` = max(`scraped_at`) → fraîcheur visible par Google
- Maillage interne renforcé par les liens guides (objectif n°1).
- `<title>` / meta description inchangés dans leur structure (déjà optimisés : « Crete Bus Schedules - KTEL Routes & Prices »).

## 5. Multilingue (22 langues)

- On suit le pattern existant : libellés UI dans le dict `T` (en/fr/de/el aujourd'hui), fallback `en` via la fonction `t()` sur les 18 autres locales.
- Les nouveaux libellés (badge fraîcheur, liens sas guides, message « pas de bus direct », lien comparer modes) ajoutés en en/fr/de/el.
- Les noms de lieux (`from_place`, `to_place`, `name`) restent stables (toponymes), pas de traduction.
- Pas de sur-ingénierie i18n : cohérent avec le reste du site.

## 6. Tests

- **Localisation du code** : le scraper (`buses.py`), ses fixtures et ses tests vivent dans le repo `cretepulse-build` sous `scripts/scrapers/buses/`, et sont déployés sur le VPS (`/opt/cretepulse/buses.py`) au même titre que les crons existants. Langage Python pour rester cohérent avec `news.py` / `weather.py`. Les tests tournent donc en local / CI sur les fixtures committées.
- **Parsers scraper** (point le plus fragile) : tests unitaires sur des **fixtures HTML/PDF réelles** capturées depuis ktelherlas.gr et e-ktel.com (committées sous `scripts/scrapers/buses/fixtures/`). Vérifient le parsing → schéma normalisé.
- **Garde-fou transactionnel** : test que sur scrape vide / sous le seuil, la dernière donnée valide est conservée et l'alerte déclenchée.
- **Rendu page** : test avec données mockées (lignes + destinations), vérifie présence du sas guides, du badge fraîcheur, du message « pas de bus direct ».
- **JSON-LD** : parse `node` du `<script type="application/ld+json">` rendu, validation structure.
- **Validation manuelle** : `curl localhost` par locale (en/fr/de/el + 1 locale fallback) avant push.

## 7. Mise en ligne (ordre)

1. Migration SQL `bus_operators` + `bus_routes` + `bus_destinations` appliquée sur `cretepulse-db`.
2. Seed initial `bus_destinations` (curé) + premier run du scraper pour peupler `bus_routes`.
3. Bascule de la page : lecture DB au lieu du tableau hardcodé, suppression du tableau `ROUTES` hardcodé.
4. Branche `feat/buses-authority-page` → validation visuelle (screenshots desktop + mobile) → push `master` puis `master:main` (prod Vercel depuis `main`, drift connu et documenté).
5. Cron VPS `buses.py` activé (hebdo).

## 8. Risques et mitigations

| Risque | Mitigation |
|--------|------------|
| Structure HTML/PDF des sites KTEL change | Garde-fou transactionnel + alerte Telegram ; dernière donnée valide conservée ; fixtures de test à mettre à jour |
| Données saisonnières incohérentes (été/hiver) | Champ `season` ; afficher la saison en cours + note |
| Cannibalisation avec `getting-around/[route]` | Page mono-bus + liens croisés, jamais d'URL destination concurrente (cf. §2) |
| PDF difficiles à parser | Si un opérateur ne publie qu'en PDF non parsable, fallback : curation manuelle de cet opérateur dans `bus_routes` + scraper sur l'autre |
| Charge sur les sites KTEL | Cron hebdo, un seul fetch par opérateur, User-Agent identifié |

## 9. Critères de succès (mesure à J+30 puis J+90)

- `/buses` (toutes locales) reste n°1 trafic et progresse (Vercel Analytics).
- Apparition de clics internes depuis `/buses` vers les guides (`things-to-do`, `where-to-stay`, plages) — à instrumenter via events Vercel ou logs.
- Couverture : passage de 10 lignes inter-villes à l'ensemble des lignes scrapées + destinations plages/villages/sites curées.
- Données datées de moins de 8 jours en permanence (badge « Mis à jour le X »).
- Position GSC sur « crete bus », « ktel timetable », « bus to {plage} » (suivi mensuel).
