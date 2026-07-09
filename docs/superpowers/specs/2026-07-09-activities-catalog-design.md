# Catalogue d'exemples d'activités — verticale /activities (crete.direct)

Date : 2026-07-09
Statut : spec validée en brainstorming avec Kami (design approuvé « go »)
Prérequis : verticale /activities LIVE PROD 09/07 (spec `2026-07-08-activities-vertical-design.md`)

## Problème

Les pages /activities (mère, catégorie, catégorie/ville) affichent le wizard, les cartes
catégories avec badge « on request », le how-it-works et la FAQ, mais **aucun exemple
concret d'activité**. Le visiteur ne voit ni ce qu'il peut demander ni un ordre de prix :
friction forte à la demande de devis, conversion faible attendue.

## Décisions produit (tranchées avec Kami, 09/07/2026)

1. **Contenu = activités réelles scrapées** des sites de prestataires locaux ciblés
   (prospects de la verticale), pas d'éditorial inventé.
2. **Anonymisées** : titre, résumé, durée réels, mais jamais le nom ni le lien du
   prestataire (protège la commission 15% et le circuit multi-devis aveugle).
   `source_url` + `source_name` conservés en base (règle anti-invention : aucune
   donnée sans URL source) mais jamais exposés au front.
3. **Prix = fourchette indicative** « à partir de ~X€/pers », basée sur le prix public
   scrapé, arrondi. Nullable si le prix public n'est pas trouvable.
4. **Périmètre initial** : prestataires réels prospectés/prospectables couvrant les
   15 combos (3 catégories × 5 villes), cible 2-4 activités par combo (~30-50 items).
   Premier sourcing : Bonnie & Clyde Urban Tours (food-tours Chania, prospect chaud n°1).

## Architecture

### Données

Nouvelle table Supabase `activity_catalog_items` (migration SQL, même schéma de
déploiement que les 4 tables existantes de la verticale) :

| Colonne | Type | Notes |
|---|---|---|
| `id` | bigint identity PK | |
| `category` | text NOT NULL | slug ∈ `ACTIVITY_CATEGORIES` |
| `city` | text NOT NULL | slug ∈ `ACTIVITY_CITIES` |
| `title` | text NOT NULL | anglais, source scrapée, reformulé pour anonymiser |
| `summary` | text NOT NULL | anglais, 1-2 phrases, reformulé (pas de copier-coller du site source) |
| `duration_label` | text | forme numérique universelle uniquement (`~3h`, `6-7h`), jamais de mots, donc aucune traduction nécessaire |
| `price_from_eur` | integer NULL | prix public constaté arrondi ; NULL = pas de prix affiché |
| `translations` | jsonb NOT NULL DEFAULT '{}' | `{ fr: {title, summary}, de: {...}, ... }` 21 locales hors en |
| `source_url` | text NOT NULL | interne uniquement, jamais renvoyé au front |
| `source_name` | text NOT NULL | interne uniquement |
| `partner_id` | bigint NULL REFERENCES activity_partners(id) | lié quand le prestataire signe |
| `active` | boolean NOT NULL DEFAULT true | |
| `display_order` | integer NOT NULL DEFAULT 0 | tri au sein d'un combo |
| `created_at` / `updated_at` | timestamptz | |

Index : `(category, city, active)`.

Contrainte de confidentialité : la fonction de lecture front ne SELECT jamais
`source_url`/`source_name` (liste de colonnes explicite, pas de `select *`).

### Collecte (hors runtime)

- Sourcing fait par Claude (WebFetch/Playwright) sur les sites des prestataires ciblés,
  catégorie par catégorie. Titre/summary **reformulés** (anonymisation + pas de
  copie verbatim du site source), prix public noté tel que constaté avec date.
- Sortie intermédiaire : `data/activity-catalog-seed.json` (items + champ interne
  `contact`/`notes` de prospection). Ce JSON sert AUSSI de liste de prospection
  pour Kami (double usage assumé). Il n'est pas committé s'il contient des
  contacts : garder les contacts dans un fichier séparé non versionné.
- Traductions 21 locales de title/summary générées au seed (par Claude, même
  exigence orthographique que le reste du site), stockées dans `translations`.
- Insertion via `scripts/seed-activity-catalog.mjs` (upsert idempotent par
  `(source_url, title)`), re-runnable pour MAJ.
- Pas de cron de re-scraping (YAGNI, catalogue peu volatil). MAJ = re-run manuel.

### Lecture

Nouvelle lib `src/lib/activity-catalog-db.ts` :
- `catalogItemsFor(category, city, locale)` : items actifs du combo, localisés
  (fallback en), sans colonnes sources.
- `catalogItemsForCategory(category, locale, limitPerCity)` : mix des 5 villes.
- `catalogHighlights(locale, limit)` : sélection pour la page mère (6 items,
  répartis sur les catégories).
Requêtes côté serveur uniquement, servies via l'ISR déjà en place
(`revalidate = 3600` sur les 3 niveaux de pages) : zéro requête client.

### Affichage

Section « Exemples d'activités » (titre localisé 22 locales, ajouté aux content.ts
des 3 niveaux de pages) :

- `/activities/[category]/[city]` : les items du combo (jusqu'à 4).
- `/activities/[category]` : mix des villes (jusqu'à ~8, groupés ou étiquetés par ville).
- `/activities` (page mère) : 6 items en vitrine, répartis sur les 3 catégories.

Carte : titre, résumé 1-2 lignes, badge durée, « à partir de ~X€/pers » si prix.
Style `card-base` existant, même grille que les cartes catégories.

**Interaction = conversion, pas navigation sortante** :
- Sur `/activities/[category]/[city]` : la carte scrolle vers le wizard (`#wizard`,
  ancre à poser sur le conteneur du wizard), déjà pré-rempli par la page.
- Sur la page mère et `/activities/[category]` : la carte est un `<Link>` vers
  `/{locale}/activities/{category}/{city}#wizard` (le wizard y est pré-rempli via
  les props `initialCategory`/`initialCity` existantes). Bonus : maillage interne SEO.

Mention honnête sous chaque section (22 locales) : exemples indicatifs d'activités
proposées dans la région ; le prix exact vient du devis des prestataires.

Si un combo n'a aucun item actif : la section est masquée sur la page combo
(pas de section vide), comportement inchangé par ailleurs.

### SEO

- Les items enrichissent le texte SSR des pages (elles sont aujourd'hui minces).
- Pas de JSON-LD `Product`/`Offer` sur les items (prix indicatifs, pas d'offre
  ferme réservable) : on s'en tient au FAQPage/BreadcrumbList existants.

## Ce qui ne change pas

Wizard (logique interne), circuit multi-devis aveugle, emails, admin `/admin/activities`,
crons `activity-relance`/`activity-no-quote`, tables existantes. Le catalogue est
purement additif : 1 table + 1 lib + 1 script de seed + sections front.

## Contraintes de contenu

- Voix crete.direct : honnête, concrète, locale. Pas de superlatifs, pas de garanties.
- Zéro em dash, orthographe irréprochable dans les 22 locales.
- Aucun nom de prestataire ni marque dans le contenu visible.
- Prix affichés uniquement s'ils viennent d'un prix public constaté (source datée en base).

## Tests

- Script `scripts/check-activity-catalog.mjs` sur le modèle des 4 `check:activity-*` :
  validation slugs, non-exposition de `source_url`/`source_name` dans la lib de lecture,
  fallback locale, combos vides masqués.
- `tsc` + `next build` verts avant push (règle repo).
- Mockup de la section AVANT push (règle `feedback_mockup_avant_deploy`), preview
  Vercel sur la branche avant merge prod.

## Workflow

Branche `feat/activities-catalog` depuis `master`, preview Vercel, merge conscient
`master` puis `git push origin master:main`. Git author kerjeanfrancois29.

## Hors périmètre (explicitement)

- Re-scraping automatisé / cron.
- Affichage des vrais produits partenaires avec leur nom après signature (le lien
  `partner_id` prépare le terrain, l'UI de cette évolution sera une spec séparée).
- Photos des activités scrapées (droits d'image non acquis ; v1 = cartes texte.
  Si visuels souhaités plus tard : photos propres ou banques libres, spec séparée).
