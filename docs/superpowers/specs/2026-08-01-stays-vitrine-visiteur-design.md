# Stays · vitrine visiteur (lot C)

Date : 01/08/2026
Branche : `feat/stays-vitrine` · worktree `C:\Users\fkerj\cp-stays-vitrine`
Specs amont : `2026-07-24-crete-direct-stays-design.md`
Plans amont : `2026-07-28-stays-lot-a-tunnel-encaissement.md`, `2026-07-28-stays-lot-b-autonomie-campagne.md`

## 1. Problème

Les lots A et B ont livré la mécanique : Stripe Connect, synchro iCal, expiration 7 jours,
emails 4 langues, cockpit `/admin/stays`. Aucun lot n'a jamais porté la surface visiteur.
Constat de François le 01/08, vérifié en prod et dans le code :

- `src/app/[locale]/stays/[slug]/page.tsx` rend `{listing.photos?.[0] && ...}`, donc **une
  seule photo** alors que la base en porte 15 (Danae), 27 (Ferma), 13 (Makrygialos).
- Le « calendrier » du lot A est en réalité deux `input type=date` natifs, plus une liste de
  chips de dates barrées plafonnée à 45, affichée SOUS le formulaire.
- La description est servie en **anglais sur `/fr`** : elle vient de `og:description`
  d'Airbnb (`airbnb-scrape.ts`) et n'est jamais traduite. Les 4 langues couvrent l'UI et les
  emails, jamais le contenu propriétaire.
- Aucun avis, aucune recherche, aucun filtre, aucun fait structuré affiché, aucun total
  montré au voyageur avant qu'il envoie sa demande.

Conséquence commerciale : cette fiche est aussi l'argument de vente auprès des propriétaires
qu'on veut démarcher. Face à leur page Airbnb, elle perd.

## 2. État mesuré du code (01/08/2026)

Ce qui existe déjà et qu'on ne reconstruit pas :

| Élément | Fichier | État |
|---|---|---|
| Colonnes faits | `stay_listings` | `bedrooms`, `beds`, `max_guests`, `property_type`, `amenities`, `zone_id`, `location_slug`, `lat`, `lng`, `airbnb_id`, `airbnb_url` **existent déjà** |
| Formule de prix | `src/lib/stays/pricing.ts` | Source unique, gardée par `scripts/check-stays.mjs` |
| Disponibilité | `/api/stays/availability/[slug]` | Rend le JSON des nuits prises |
| Scrape Airbnb | `src/lib/stays/airbnb-scrape.ts` | **54 lignes, balises `og:` uniquement** : title, description, photos. Ni note, ni avis, ni faits |
| Enrichissement LLM | `src/lib/affiliate-enrich.ts` | Le dépôt a tranché : génération de texte **déléguée à un worker VPS** (`claude -p --model claude-haiku-4-5`), jamais au serverless |

Les colonnes de faits existent mais ne sont **ni collectées au dépôt d'annonce, ni
affichées**. `src/app/api/stays/new/route.ts` n'écrit que titre, description, photos, prix,
ménage, min_nights.

## 3. Décisions (arbitrages François, 01/08/2026)

1. **Avis** : on affiche les avis Airbnb.
2. **Collecte des avis** : capture UNE fois à la publication, stockée avec sa date de relevé.
   Re-capture manuelle depuis l'admin. Pas de cron de rafraîchissement (une panne Airbnb
   serait silencieuse et les avis vieilliraient sans qu'on le voie).
3. **Pas de lien sortant vers Airbnb.** Mention « avis publiés sur Airbnb, relevés le
   JJ/MM/AAAA », sans lien. Tout le modèle est de réserver en direct : envoyer le voyageur
   sur Airbnb, c'est lui faire payer les frais qu'on prétend lui éviter.
4. **Faits structurés** : base plus équipements. Capacité, chambres, salles de bain, m²,
   zone, piscine, vue mer, clim, wifi, BBQ, parking, animaux.
5. **Contenu propriétaire** : traduction automatique en EN/FR/DE/EL, révisable depuis
   l'espace propriétaire.
6. **Recherche et filtres** : dans ce lot.

## 4. Architecture · trois couches étanches

| Couche | Exécution | Responsabilité |
|---|---|---|
| Lecture | Next, Vercel | Fiche, liste, filtres, devis, calendrier. **Zéro appel réseau sortant**, tout vient de la base |
| Écriture propriétaire | Next, Vercel | Wizard `/stays/new` et espace propriétaire : faits, prix, photos, URL Airbnb |
| Workers | VPS, hors ligne | Traduction Haiku, capture des avis. Écrivent en base, **jamais appelés par une page** |

Pourquoi cette séparation, et elle n'est pas négociable :

- Airbnb bloque les collectes venant d'IP cloud. Un scrape depuis une route Vercel casserait
  la publication elle-même.
- La traduction coûte plusieurs secondes et une clé Anthropic que Vercel n'a pas. Le dépôt a
  déjà tranché ce point pour les affiliés.
- **Les faits structurés ne dépendent PAS du scraping.** Ils sont saisis par le propriétaire,
  pré-remplis par le scrape quand il réussit. Sinon une panne Airbnb bloquerait toute la
  vitrine.

## 5. Données

### 5.1 `stay_listings`, colonnes ajoutées

Migration `20260801_stays_vitrine.sql`.

```sql
alter table stay_listings add column if not exists bathrooms smallint;
alter table stay_listings add column if not exists area_sqm smallint;
```

Tout le reste existe. `amenities` (jsonb) reçoit un tableau de clés parmi une liste fermée
définie dans `src/lib/stays/facts.ts` : `pool`, `sea_view`, `ac`, `wifi`, `bbq`, `parking`,
`pets`, `washer`, `dishwasher`, `crib`. Une clé inconnue est ignorée à l'affichage, jamais
rendue brute.

### 5.2 `stay_listing_i18n`

```sql
create table stay_listing_i18n (
  listing_id  bigint not null references stay_listings(id) on delete cascade,
  locale      text   not null check (locale in ('en','fr','de','el')),
  title       text,
  description text,
  source      text   not null check (source in ('owner','auto')),
  updated_at  timestamptz not null default now(),
  primary key (listing_id, locale)
);
```

Invariant : **une ligne `source='owner'` ne se fait jamais écraser par le worker de
traduction.** Le propriétaire qui corrige sa version française la garde.

### 5.3 `stay_listing_reviews` et `stay_reviews`

```sql
create table stay_listing_reviews (
  listing_id    bigint primary key references stay_listings(id) on delete cascade,
  rating_avg    numeric(2,1),
  reviews_count integer,
  captured_at   timestamptz not null
);

create table stay_reviews (
  id          bigserial primary key,
  listing_id  bigint not null references stay_listings(id) on delete cascade,
  author      text,          -- prénom seul
  period      text,          -- "2025-07", mois seulement
  rating      smallint,
  body        text not null,
  captured_at timestamptz not null
);
```

RGPD : **prénom et mois seulement.** Jamais de nom complet, de photo d'auteur, ni de lien
vers un profil. Ce sont des données publiées publiquement par Airbnb, mais on les republie :
la minimisation est notre responsabilité, pas la leur.

## 6. Surface fiche `/[locale]/stays/[slug]`

Ordre de lecture, de haut en bas :

1. **Titre** plus ligne de faits courte : zone, capacité, chambres, salles de bain, m².
2. **Galerie**, toutes les photos. Grille 1 grande plus 4 vignettes au-dessus de 768 px,
   carrousel à défilement horizontal en dessous. Pas de lightbox JS dans ce lot :
   un clic ouvre la photo pleine largeur en dessous, zéro dépendance.
3. **Bandeau d'équipements** : pictogrammes plus libellé traduit, uniquement les clés
   présentes. Une absence ne s'affiche pas (« pas de piscine » ne se dit pas).
4. **Description** dans la langue de la page, repli sur l'original avec la mention
   « description rédigée en anglais » quand la traduction n'est pas encore là.
5. **Bloc réservation** :
   - Calendrier deux mois, nuits prises grisées et non cliquables, sélection arrivée puis
     départ. Source : `/api/stays/availability/[slug]`, déjà en place.
   - **Devis en direct** dès que les deux dates sont posées : N nuits × prix, ménage, frais
     de paiement 5 %, total. Puis la ligne « acompte 30 % aujourd'hui, solde 14 jours avant
     l'arrivée ».
   - Champs voyageur, message, bouton.
6. **Avis** : note moyenne, nombre d'avis, 5 extraits, mention « avis publiés sur Airbnb,
   relevés le JJ/MM/AAAA ». **Bloc entièrement absent quand il n'y a pas d'avis en base**,
   jamais un « aucun avis pour l'instant » qui ne fait que souligner le vide.

### 6.1 Invariant de prix, non négociable

Le devis affiché **appelle `quoteFor()` de `src/lib/stays/pricing.ts`**, il ne recalcule
rien. Un total affiché qui diverge du total encaissé serait le pire défaut possible sur
cette surface : le voyageur verrait un prix, sa carte en paierait un autre.

`scripts/check-stays.mjs` est étendu d'un cas qui compare le devis rendu par la fiche au
devis rendu par `/api/stays/request` sur les mêmes entrées. Casser la formule à un seul
endroit doit faire tomber `npm run check`.

## 7. Surface liste `/[locale]/stays`

- **Cartes enrichies** : photo, titre, zone, capacité, chambres, prix par nuit, note si
  disponible.
- **Filtres** : arrivée, départ, voyageurs, zone, prix maximum. Rendus dans l'URL en query
  string, filtrage **côté serveur**, page toujours partageable et rechargeable. Aucun état
  client, aucun `useState` sur la liste.
- Le filtre de dates s'appuie sur `unavailableNights()` : une annonce dont toutes les nuits
  demandées ne sont pas libres sort des résultats.
- **Compteur de résultats** et bouton de réinitialisation dès qu'un filtre est actif.
- Zéro résultat : phrase claire plus lien pour retirer les filtres. Jamais une page vide.

## 8. Workers VPS

### 8.1 Traduction · `scripts/translate-stay-listings.mjs`

- Cible les annonces dont `stay_listing_i18n` a moins de 4 lignes.
- Appelle `claude -p --model claude-haiku-4-5-20251001`, une annonce par appel, les 4 langues
  en une passe, sortie JSON stricte.
- Écrit `source='auto'`. **N'écrase jamais une ligne `source='owner'`.**
- Idempotent : relancé, il ne retraduit que ce qui manque.
- Journalise chaque annonce traitée. Une sortie non parsable est comptée en échec et
  l'annonce reste sans traduction, la fiche sert alors l'original. Pas de traduction
  partielle en base.

### 8.2 Avis · `scripts/capture-stay-reviews.mjs`

- Entrée : `listing_id` ou `--all-missing`.
- Étend `airbnb-scrape.ts` d'un `parseAirbnbReviews(html)` **pur et testé sur des fixtures
  HTML committées**, pour que le parseur reste testable sans réseau.
- Écrit `stay_listing_reviews` plus au maximum 5 lignes `stay_reviews`, avec `captured_at`.
- Échec de collecte : **rien n'est écrit**, le script sort en code 1 avec la raison. Une
  capture ratée ne doit jamais vider des avis déjà en base.
- Le format d'Airbnb changera. Le parseur est isolé, ses fixtures sont dans le dépôt, et son
  échec n'a aucun effet sur la fiche.

### 8.3 Saisie de repli

Une annonce sans URL Airbnb n'a pas d'avis, sa fiche est simplement plus courte. Accepté au
lancement. Le propriétaire peut saisir ses faits à la main depuis son espace : les faits ne
dépendent jamais du scrape.

## 9. Interdits et cadre

- **Zéro mention Kairos** sur ces surfaces (`feedback_crete_direct_no_kairos_mention`).
- **Aucun em dash** dans les `.ts/.tsx/.json`, le linter `check:da` R11 refuse le commit.
  Séparateurs : point médian, virgule, point, deux-points.
- **`noindex` conservé sur toutes les pages Stays pendant tout le lot.** Sa levée reste
  conditionnée à la régularisation des 3 annonces et au seuil de 5 annonces réelles.
- **Aucune donnée inventée.** Pas de note par défaut, pas d'équipement supposé, pas de photo
  de remplacement. Une donnée absente ne s'affiche pas.
- **Maquette HTML avant tout déploiement** (`feedback_mockup_avant_deploy`) :
  `docs/mockups/2026-08-01-stays-fiche.html`, validée par François avant le push.

## 10. Tests

- TDD, vitest, un test avant chaque unité de logique.
- Purs et testés en priorité : `facts.ts` (normalisation des équipements), le calcul du
  devis affiché, le filtrage de la liste, `parseAirbnbReviews`, le repli de langue.
- `scripts/check-stays.mjs` étendu : parité du devis fiche contre devis API.
- `npm run check` vert avant chaque push. `next build` vert.
- Les 3 annonces existantes sont ressaisies dans une tâche dédiée, pas en effet de bord.

## 11. Hors périmètre

Collecte d'avis maison après séjour · lightbox et zoom photo · carte interactive sur la
fiche · paiement en plusieurs fois · messagerie voyageur propriétaire · cron de
rafraîchissement des avis · levée du noindex.

## 12. Découpage en lots

| Lot | Contenu | Dépend de |
|---|---|---|
| **C1 · Fiche** | Migration, `facts.ts`, galerie, bandeau faits, calendrier, devis en direct, gate de parité | rien |
| **C2 · Liste** | Cartes enrichies, filtres serveur, compteur, état vide | C1 (`facts.ts`) |
| **C3 · Preuve et langue** | `stay_listing_i18n`, worker traduction, repli de langue, tables avis, `parseAirbnbReviews`, worker capture, bloc avis | C1 (surface fiche) |
| **C4 · Données** | Saisie des faits dans le wizard et l'espace propriétaire, ressaisie des 3 annonces existantes | C1 |

C2, C3 et C4 sont indépendants entre eux et peuvent être menés en parallèle une fois C1 posé.
