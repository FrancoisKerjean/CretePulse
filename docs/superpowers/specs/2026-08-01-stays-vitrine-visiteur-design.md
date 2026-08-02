# Stays · vitrine visiteur (lot C)

Date : 01/08/2026 · v2 après relecture adversariale
Branche : `feat/stays-vitrine` · worktree `C:\Users\fkerj\cp-stays-vitrine`
Specs amont : `2026-07-24-crete-direct-stays-design.md`
Plans amont : `2026-07-28-stays-lot-a-tunnel-encaissement.md`, `2026-07-28-stays-lot-b-autonomie-campagne.md`

## 1. Problème

Les lots A et B ont livré la mécanique : Stripe Connect, synchro iCal, expiration 7 jours,
emails 4 langues, cockpit `/admin/stays`. Aucun lot n'a jamais porté la surface visiteur.
Constat de François le 01/08, vérifié en prod et dans le code :

- `[slug]/page.tsx:50` rend `{listing.photos?.[0] && ...}`, donc **une seule photo** alors que
  la base en porte plusieurs dizaines par annonce.
- Le « calendrier » du lot A est deux `input type=date` natifs (`RequestForm.tsx:102` et
  `:106`), plus une liste de chips de dates barrées plafonnée à 45 (`[slug]/page.tsx:101`),
  affichée SOUS le formulaire.
- La description est servie en **anglais sur `/fr`** : elle vient de `og:description`
  (`airbnb-scrape.ts:28`) et n'est jamais traduite.
- Aucun avis, aucune recherche, aucun fait structuré affiché, aucun total montré au voyageur
  avant qu'il envoie sa demande.

Cette fiche est aussi l'argument de vente auprès des propriétaires qu'on démarche. Face à
leur page Airbnb, elle perd.

## 2. État mesuré du code (01/08/2026)

| Élément | Emplacement | État vérifié |
|---|---|---|
| Colonnes faits | `supabase/migrations/20260724_stays_marketplace.sql` | `bedrooms`, `beds`, `max_guests`, `property_type`, `amenities` (jsonb), `zone_id`, `location_slug`, `lat`, `lng`, `airbnb_id`, `airbnb_url` **existent**, ne sont ni collectées ni affichées |
| Prix | `src/lib/stays/pricing.ts` | Exporte `nightsBetween`, `DEPOSIT_PCT`, `balanceApplicationFeeCents`, **`computeQuote`**. Il n'existe pas de `quoteFor` |
| Disponibilité | `src/lib/stays/availability.ts` | `isRangeFree(booked, from, to)` (`:31`) et `unavailableNights(booked)` (`:42`). Convention `[)` documentée `:13-17` |
| Nuits prises | `src/lib/stays/db.ts:166` | `bookedRangesForListing(listingId)`, **mono-annonce**. Aucune requête agrégée n'existe |
| Devis | `src/app/api/stays/approve/route.ts:28` | **Le propriétaire SAISIT le prix à l'approbation** (`Number(body.price)`), champ vide au chargement (`ApprovePanel.tsx:41`). `/api/stays/request` ne calcule aucun montant |
| Dépôt d'annonce | `src/app/api/stays/new/route.ts:37-49` | Écrit `owner_id`, `slug`, `airbnb_id`, `airbnb_url`, titre, description, photos, prix, ménage, `min_nights`, `publish_token_hash`. Aucun fait structuré |
| Scrape | `src/lib/stays/airbnb-scrape.ts` | 54 lignes, balises `og:` uniquement |
| Worker LLM | `src/lib/affiliate-enrich.ts:1-18` | Le dépôt a tranché : génération de texte au **worker VPS** `claude -p --model claude-haiku-4-5`, jamais au serverless |
| i18n | `src/app/[locale]/stays/content.ts` | ~1000 lignes, 4 langues à la main. `check:i18n` ne le couvre pas (il ne lit que `src/messages/*.json`) |

### 2.1 Ce que le HTML d'Airbnb contient réellement

Mesuré le 01/08/2026 : `curl` sur une annonce publique depuis l'IP résidentielle, HTTP 200,
605 KB.

**Présent dans le HTML statique** : `reviewCount`, `starRating`, `guestSatisfactionOverall`
et les sous-notes (propreté, communication, emplacement, rapport qualité prix),
`personCapacity`, `propertyType`, `roomType`, `listingLat`, `listingLng`, `amenities`,
« N chambres · N lits » dans le titre de partage, et **`descriptionLanguage`**.

**Absent** : les textes des avis. Zéro occurrence de `comments`, `reviewer`,
`localizedDate`, `reviewsModule`. Ils sont chargés par un second appel GraphQL signé.

Conséquences directes, elles structurent tout le lot :

1. **Le bloc avis affiche une note et un nombre, pas des extraits.** Aller chercher les
   textes voudrait dire attaquer l'API interne d'Airbnb : bien plus fragile, bien plus
   agressif, et cassable du jour au lendemain. Arbitrage ouvert, voir §3.
2. **La langue de la description est donnée, pas devinée.** `descriptionLanguage` ferme le
   trou : on ne dira jamais « rédigée en anglais » sans le savoir.
3. **Les faits structurés sont pré-remplissables** par le scrape, tout en restant modifiables
   à la main.

## 3. Décisions (arbitrages François, 01/08/2026)

1. **Avis Airbnb affichés.**
2. **Capture UNE fois à la publication**, stockée avec sa date de relevé. Re-capture manuelle
   depuis l'admin. Pas de cron : une panne serait silencieuse et les avis vieilliraient sans
   qu'on le voie.
3. **Aucun lien sortant vers Airbnb.** Mention « note relevée sur Airbnb le JJ/MM/AAAA ».
   Envoyer le voyageur sur Airbnb, c'est lui faire payer les frais qu'on prétend lui éviter.
4. **Faits** : base plus équipements.
5. **Traduction automatique** de la description en EN/FR/DE/EL, révisable.
6. **Recherche et filtres** dans ce lot.

⚠️ **Arbitrage rouvert par la mesure du §2.1** : la décision 1 supposait des extraits d'avis.
Ils ne sont pas atteignables proprement. Cette spec retient **note plus nombre d'avis, sans
extraits**. Si François veut des textes, ils viendront d'une saisie du propriétaire dans son
espace, pas d'un scrape.

## 4. Architecture · trois couches étanches

| Couche | Exécution | Responsabilité |
|---|---|---|
| Lecture | Next, Vercel | Fiche, liste, filtres, devis, calendrier. **Zéro appel réseau sortant** |
| Écriture propriétaire | Next, Vercel | Wizard `/stays/new`, espace propriétaire : faits, prix, photos |
| Workers | VPS, hors ligne | Traduction Haiku, capture Airbnb. Écrivent en base, **jamais appelés par une page** |

Non négociable : Airbnb bloque les IP cloud, et la traduction demande une clé que Vercel n'a
pas. **Les faits structurés ne dépendent jamais du scrape** : il pré-remplit, le propriétaire
tranche. Sinon une panne Airbnb bloque toute la vitrine.

## 5. Données

Migration `supabase/migrations/20260801_stays_vitrine.sql`. Les types TypeScript
correspondants sont ajoutés à `StayListing` dans `src/lib/stays/types.ts` dans la même tâche.

### 5.1 `stay_listings`, colonnes ajoutées

```sql
alter table stay_listings add column if not exists bathrooms smallint;
alter table stay_listings add column if not exists area_sqm smallint;
alter table stay_listings add column if not exists description_locale text;
alter table stay_listings add column if not exists rating_avg numeric(3,2);
alter table stay_listings add column if not exists reviews_count integer;
alter table stay_listings add column if not exists reviews_captured_at timestamptz;
```

Note et nombre d'avis vivent **sur l'annonce**, pas dans une table dédiée : c'est un couple
de scalaires, une table séparée n'apporterait qu'une jointure. Pas de table `stay_reviews`
tant qu'il n'y a pas de textes à stocker.

`amenities` (jsonb) reçoit un tableau de clés d'une liste fermée définie dans
`src/lib/stays/facts.ts` : `pool`, `sea_view`, `ac`, `wifi`, `bbq`, `parking`, `pets`. Sept
clés, celles que le scrape sait remplir et qui décident d'une location. Une clé inconnue est
ignorée à l'affichage, jamais rendue brute.

`description_locale` reçoit `descriptionLanguage` du scrape, ou la langue déclarée par le
propriétaire. Sans elle, aucune mention de langue n'est affichée.

### 5.2 `stay_listing_i18n`

```sql
create table stay_listing_i18n (
  listing_id  bigint not null references stay_listings(id) on delete cascade,
  locale      text   not null check (locale in ('en','fr','de','el')),
  description text   not null,
  source      text   not null check (source in ('owner','auto')),
  updated_at  timestamptz not null default now(),
  primary key (listing_id, locale)
);
```

**Description seulement, pas de titre.** Le titre vient d'`og:title` et tient du nom propre
(« Villa Danae ») : le traduire ne rend rien. Le grain de `source` est donc sans ambiguïté,
une ligne porte un seul champ.

Invariant : **une ligne `source='owner'` n'est jamais écrasée par le worker.**

## 6. Surface fiche `/[locale]/stays/[slug]`

1. **Titre** plus ligne de faits : zone, capacité, chambres, salles de bain, m². Chaque fait
   absent disparaît, aucun « n/d » sur une surface voyageur.
2. **Galerie**, toutes les photos. Grille 1 grande plus 4 au-dessus de 768 px, carrousel
   horizontal en dessous. **Pas de lightbox, pas d'agrandissement au clic** : la grille est
   déjà en grande taille, l'état client ne rendrait rien.
3. **Bandeau d'équipements** : uniquement les clés présentes. Une absence ne s'affiche pas.
4. **Description** dans la langue de la page. Repli sur l'original avec la mention de sa
   langue réelle, tirée de `description_locale`, et rien du tout si elle est inconnue.
5. **Bloc réservation** : calendrier, devis, champs, bouton. Détail en §6.1 et §6.2.
6. **Note** : « ★ 4,93 sur 15 avis, relevé sur Airbnb le JJ/MM/AAAA ». **Bloc absent** si
   `reviews_count` est nul, jamais un « aucun avis pour l'instant ».

### 6.1 Calendrier · la règle des bornes

Convention `[)`, documentée dans `availability.ts:13-17` et gravée par la contrainte GIST
`daterange(date_from, date_to, '[)')`.

**Une nuit prise D interdit l'arrivée le D, jamais le départ le D.** Deux séjours qui se
touchent ne se chevauchent pas. Un calendrier qui rend D non cliquable rendrait invendable
tout trou adjacent à une réservation.

Règles retenues :
- Une nuit prise est barrée et **refusée à l'arrivée**.
- Elle reste **cliquable comme date de départ**.
- Après le choix de l'arrivée, les jours situés au-delà de la première nuit prise suivante
  sont désactivés : l'utilisateur ne peut pas construire une plage qui enjambe une
  réservation. C'est `isRangeFree()` appliqué à l'avance, pas un message d'erreur a posteriori.
- Sous `min_nights`, le bouton est désactivé avec la raison affichée. Le devis reste visible.

### 6.2 Devis · ce qu'il est et ce qu'il n'est pas

Le devis appelle **`computeQuote()` de `pricing.ts`**, il ne réimplémente aucune formule.

⛔ **Le montant affiché est une estimation, et la spec le dit à l'écran.** Le prix encaissé
est celui que le propriétaire saisit à l'approbation (`approve/route.ts:28`), champ
aujourd'hui **vide au chargement** (`ApprovePanel.tsx:41`). Deux corrections, dans ce lot :

1. **Pré-remplir le champ d'approbation** avec `base_price_eur × nuits`, pour que le cas
   normal soit l'accord et non la ressaisie.
2. **Étiqueter le devis voyageur** : « estimation sur la base du tarif affiché, confirmée par
   le propriétaire sous 48 h ». Aucun engagement de prix n'est pris sur cette page.

Garde obligatoire : `nightsBetween` **lève** si `nights <= 0` (`pricing.ts:9-11`). Le devis
n'est calculé que lorsque les deux dates sont posées et que départ > arrivée. Aucun appel nu.

Le gate `check:stays` **n'est pas étendu à une parité fiche contre API** : `/api/stays/request`
ne produit aucun montant, la comparaison n'aurait rien à comparer. À la place, un test
unitaire vérifie que le composant de devis appelle `computeQuote` et n'a aucune arithmétique
propre.

## 7. Surface liste `/[locale]/stays`

- **Cartes** : photo, titre, zone, capacité, chambres, prix par nuit, note si elle existe.
- **Filtres** : arrivée, départ, voyageurs, zone. Rendus en query string, filtrage serveur,
  page partageable. Aucun état client.
  Pas de filtre « prix maximum » : sur un catalogue de moins de dix annonces il ne trie rien.
- **Compteur de résultats** et bouton de réinitialisation dès qu'un filtre est actif.
- Zéro résultat : phrase claire plus lien de réinitialisation. Jamais de page vide.

Deux contraintes techniques, mesurées :

**Le filtre de dates utilise `isRangeFree()`**, pas `unavailableNights()` : la question posée
est « cette plage est-elle libre », pas « quelles nuits sont prises ».

**Une seule requête pour toutes les annonces.** `bookedRangesForListing` est mono-annonce :
l'appeler en boucle ferait N requêtes par affichage de page. `db.ts` reçoit
`bookedRangesForListings(ids: number[])`, une requête, regroupement en mémoire.

**`export const revalidate = 300` est retiré** de la page liste. Lire `searchParams` rend la
route dynamique : la valeur resterait dans le fichier en ne servant plus à rien, ce qui est
pire qu'absent. Le filtrage est appliqué **dans la requête SQL** quand c'est possible (zone,
capacité) et le plafond `limit(60)` s'applique **après** filtrage, jamais avant, sinon le
compteur mentirait.

## 8. Workers VPS

### 8.1 Traduction · `scripts/translate-stay-listings.mjs`

- Cible les annonces dont `stay_listing_i18n` a moins de 4 lignes.
- `claude -p --model claude-haiku-4-5-20251001`, une annonce par appel, 4 langues en une
  passe, sortie JSON stricte.
- Écrit `source='auto'`, **n'écrase jamais `source='owner'`**.
- Idempotent, journalisé. Sortie non parsable : échec compté, rien n'est écrit, la fiche sert
  l'original. Pas de traduction partielle en base.
- **Les 18 autres locales du site** (`pickStaysLocale`, `content.ts:17`) reçoivent la version
  anglaise, comme le reste de la surface Stays.

### 8.2 Capture Airbnb · `scripts/capture-airbnb-facts.mjs`

- Entrée : `listing_id` ou `--all-missing`. Nécessite `airbnb_url`, écrit par
  `/api/stays/new` depuis le premier jour.
- Étend `airbnb-scrape.ts` d'un `parseAirbnbFacts(html)` **pur, testé sur des fixtures HTML
  committées**, donc testable sans réseau.
- Extrait : `starRating`, `reviewCount`, `personCapacity`, `propertyType`, `lat`, `lng`,
  `descriptionLanguage`, équipements, chambres et lits.
- Écrit les faits **seulement là où la colonne est nulle** : une saisie du propriétaire n'est
  jamais écrasée par un scrape. Note, nombre d'avis et `reviews_captured_at` sont eux
  toujours rafraîchis, c'est leur raison d'être.
- Échec : **rien n'est écrit**, sortie en code 1 avec la raison. Une capture ratée ne doit
  jamais vider une note déjà en base.
- Re-capture depuis `/admin/stays` : un bouton par annonce qui appelle une route protégée par
  `isCarAdmin`, laquelle **met en file** la capture. La page admin n'appelle jamais Airbnb
  elle-même.

### 8.3 Repli

Une annonce sans URL Airbnb n'a ni note ni pré-remplissage : sa fiche est plus courte, ses
faits sont saisis à la main. Accepté.

## 9. Interdits et cadre

- **Zéro mention Kairos** (`feedback_crete_direct_no_kairos_mention`).
- **Aucun em dash** dans les `.ts/.tsx/.json`, `check:da` R11 refuse le commit.
- **`noindex` conservé** sur toutes les pages Stays pendant tout le lot.
- **Aucune donnée inventée** : pas de note par défaut, pas d'équipement supposé, pas de photo
  de remplacement, pas de langue devinée. Une donnée absente ne s'affiche pas.
- **Maquette validée avant tout déploiement** (`feedback_mockup_avant_deploy`) :
  `docs/mockups/2026-08-01-stays-fiche.html`.
- **Republication de données tierces** : on republie une note et un nombre, chiffres bruts et
  factuels, avec leur source nommée et leur date de relevé. On ne republie aucun texte
  d'avis, ce qui écarte l'essentiel du risque au titre du droit du producteur de base de
  données. Le lien sortant reste écarté par choix commercial (§3.3).

## 10. Tests

- TDD, vitest, un test avant chaque unité de logique.
- Purs et testés en priorité : `facts.ts`, le devis affiché, **les règles de bornes du
  calendrier** (§6.1, le cas du départ le jour d'une nuit prise est un test à lui seul), le
  filtrage de la liste, `parseAirbnbFacts` sur fixtures, le repli de langue.
- `npm run check` et `next build` verts avant chaque push.
- **Charge i18n assumée** : `content.ts` gagne une trentaine de libellés × 4 langues, grec
  compris, à la main et sans garde-fou automatique. C'est une tâche à part entière du plan,
  pas une finition.

## 11. Hors périmètre

Extraits d'avis, collecte d'avis maison après séjour · lightbox · carte interactive · cron de
rafraîchissement · filtre prix · paiement en plusieurs fois · messagerie · levée du noindex.

## 12. Lots · chemin critique réel

La v1 annonçait C2, C3 et C4 parallélisables. C'est faux : les cartes de la liste affichent
une note produite par le lot avis, et la fiche affiche des faits qu'aucun écran ne remplit
avant le lot données. Ordre corrigé :

| Lot | Contenu | Dépend de |
|---|---|---|
| **L0 · Socle** | Migration, `types.ts`, `facts.ts`, `bookedRangesForListings`, libellés i18n | rien |
| **L1 · Données** | `parseAirbnbFacts` plus worker, saisie des faits dans le wizard et l'espace propriétaire, capture des annonces existantes | L0 |
| **L2 · Fiche** | Galerie, bandeau de faits, calendrier, devis estimatif, pré-remplissage de l'approbation, bloc note | L0, données démontrables de L1 |
| **L3 · Liste** | Cartes enrichies, filtres serveur, compteur, état vide | L0, L2 |
| **L4 · Langue** | `stay_listing_i18n`, worker de traduction, repli de langue sur la fiche | L0, L2 |

L3 et L4 sont réellement parallèles une fois L2 posé. L1 avant L2 : une fiche sans données à
afficher n'est pas démontrable, donc pas validable par François.
