# Design — Intégration des affiliés sur `/explore` + email de bienvenue honnête

**Date :** 2026-07-08
**Auteur :** Kami (via Claude, brainstorming)
**Repo :** `cretepulse-build` (crete.direct)
**Branche :** `feat/affiliates-explore`

## Contexte

Le programme d'affiliation `/affiliate` (15 %) accumule des inscrits (5 à ce jour : Halepa
Hotel, JMP Chania Tours, Travel in Chania, Theodosi Restaurant, RoadCrete [disabled]).
Au signup : insert table `affiliates` (slug + code_promo + `commission_pct=15`) + notif
Telegram + email de bienvenue automatique.

**Deux trous constatés (05/07 puis 08/07) :**

1. **L'email de bienvenue sur-promet.** Il annonce *« we feature you across crete.direct /
   every visitor we send you goes through your tracked link »* alors qu'**aucune page de
   contenu ne rend le lien `/go/<slug>`** → 0 trafic réellement envoyé. Promesse non tenue.
2. **Les affiliés ne sont visibles nulle part.** La carte `/explore` a un système
   `sponsored-places.json` (marqueur ambre, gating zoom ≥ 9), mais la table `affiliates`
   **n'a pas de coordonnées géo** → un affilié ne peut pas être posé sur la carte.

## Décisions figées (brainstorming Kami, 08/07)

- **Mécanisme de collecte de commission** = request tracé segmenté par vertical (extension du
  rail Car Rental Direct). **→ Lot 3, HORS SCOPE de ce chantier** (voir ci-dessous).
- **Déclencheur de facturation** = devis accepté par le client (= modèle voiture). **→ Lot 3.**
- **Verticaux NON-devisables (resto / café / bar)** = **vitrine gratuite, hors commission.**
  Présence sur la carte + lien tracké, mais **pas** de mention 15 %, **pas** de formulaire de
  demande. La commission % reste réservée aux verticaux à devis.

## Périmètre

**CE chantier = Lots 0 + 1 + 2.**

Le **Lot 3** (formulaire de demande générique → `*_requests` → devis accepté → facture net 15
pour les verticaux devisables) **recoupe le chantier « CRD multi-devis »** déjà en cours sur un
autre terminal (spec + Phase 1 livrées le 08/07, `704ebc5..48a7f39`). Il ne sera **pas** traité
ici pour éviter toute collision ; il se raccrochera au multi-devis séparément.

En attendant le Lot 3, **la fiche d'un affilié devisable sur `/explore` linke via `/go/<slug>`**
(clic tracké), comme une vitrine. Le formulaire de demande viendra en Lot 3.

## Segmentation des catégories

Deux classes, dérivées de `affiliates.category` :

| Classe | Catégories | Sur `/explore` | Email | Commission |
|--------|-----------|----------------|-------|------------|
| **vitrine** | `restaurant`, `cafe`, `bar`, (défaut prudent) | marqueur + fiche + CTA `/go` | « visibilité gratuite », **pas de 15 %** | aucune |
| **devisable** | `tour`, `activity`, `transfer`, `car_rental`* | marqueur + fiche + CTA `/go` (formulaire = Lot 3) | « on t'envoie des demandes, 15 % sur devis accepté » | 15 % (Lot 3) |

\* `car_rental` ne passe déjà **pas** par la table `affiliates` (routé vers Car Rental Direct au
signup) → non concerné par l'affichage `/explore` de ce chantier.

Un helper unique `affiliateClass(category): "vitrine" | "quotable"` est la source de vérité de
cette segmentation, réutilisé par l'email (Lot 0) et l'affichage (Lot 2).

---

## Lot 0 — Email de bienvenue désamorcé & segmenté

**Fichier :** `src/lib/email.ts` (`sendAffiliateWelcome`).

- Ajouter à la signature `AffiliateWelcome` le champ `category` (pour dériver la classe).
- **Retirer** les promesses non câblées : *« We feature X across crete.direct »*,
  *« every visitor we send you »*.
- **Contenu au présent réel**, branché selon `affiliateClass(category)` :
  - **vitrine** : « Tu es maintenant sur la carte crete.direct, où les voyageurs préparent
    leur voyage. Voici ton lien tracké : `<link>`. Visibilité gratuite, aucun frais. »
    → **aucune** ligne « 15 % commission ».
  - **quotable** : « Tu es sur la carte. Quand un voyageur veut réserver, la demande passe par
    ton lien tracké. Tu paies 15 % uniquement sur les devis acceptés — pas de setup, pas de
    mensuel. »
- Le bouton « See the map you're on » → `https://crete.direct/explore` reste (désormais vrai,
  puisque le Lot 2 place l'affilié sur la carte).
- Best-effort inchangé : un échec d'email ne casse jamais le signup.

**Test :** appeler `sendAffiliateWelcome` avec `category: "restaurant"` → le corps HTML ne
contient **pas** « 15% » ni « commission » ; avec `category: "tour"` → il contient « 15% ».

---

## Lot 1 — Coordonnées géo sur `affiliates`

**Migration :** `supabase/migrations/20260708_affiliates_geo.sql`

```sql
alter table affiliates add column if not exists latitude  double precision;
alter table affiliates add column if not exists longitude double precision;
```

**⚠️ PIÈGE Supabase self-hosted (constaté 08/07) :** un `ALTER TABLE` en SQL direct laisse le
**cache schéma PostgREST périmé** → `supabase-js` échoue **silencieusement** sur les nouvelles
colonnes (elles reviennent `undefined`, aucune erreur levée). **Après la migration, recharger le
cache** :

```sql
notify pgrst, 'reload schema';
```

(ou redémarrer le conteneur PostgREST). Vérifier ensuite qu'une requête
`select latitude, longitude from affiliates limit 1` renvoie bien les colonnes via l'API REST.

**Remplissage des 5 affiliés existants :** à la main (géocodage manuel des adresses connues,
volume trivial). Un `UPDATE ... where slug = ...` par affilié dans la même migration ou un
script one-off. Géocodage automatique depuis l'adresse au signup = **amélioration future, hors
scope.**

---

## Lot 2 — Affichage des affiliés sur `/explore`

### Pont de données

**Nouveau fichier :** `src/lib/affiliate-places.ts`

- `getAffiliatePlaces(): Promise<AffiliatePlace[]>` — lit la table `affiliates` :
  `status = 'active'` **ET** `latitude`/`longitude` non-null. Exclut `category = 'car_rental'`.
- Mappe chaque ligne au format consommé par `ExploreView` (même forme que `sponsorItems` :
  `slug` préfixé, `place_type`, `latitude`, `longitude`, `category`, `photos`, `__sponsorUrl`).
- `__sponsorUrl` = `https://crete.direct/go/<slug>` (toujours tracké).
- Convention de slug carte : `affiliate:<slug>` (distinct de `sponsor:<id>`), pour que le
  drawer sache router le CTA et afficher le bon libellé.

### Fusion dans la carte

**Fichier :** `src/components/explore/ExploreView.tsx`

- Ajouter les affiliés à la source de marqueurs, **à côté** de `sponsorItems`, en réutilisant
  **le même marqueur ambre** et **le même gating** (`SPONSOR_MIN_ZOOM = 9` + bounds). Pas de
  nouveau composant carte, pas de nouvelle couleur.
- La page `src/app/[locale]/explore/page.tsx` fetch `getAffiliatePlaces()` (server, ISR 24 h)
  en plus de `getAllCbPlaces()`, et passe la liste à `ExploreView`.

### Fiche drawer

- **vitrine** : titre + photo + catégorie + CTA `/go/<slug>` (« Visit website » / libellé
  localisé). Pas de mention devis.
- **quotable** : idem pour l'instant (CTA `/go` tracké). Le « Request a quote » = Lot 3.
- Le libellé du badge : « Partner » (ou localisé) — distinct du badge « Sponsored » existant si
  on veut, mais **réutiliser le composant** ; un simple mapping de libellé suffit.

### Déduplication JMP

JMP Chania Tours est aujourd'hui **en double** : présent dans `sponsored-places.json` (ajouté à
la main le 05/07) **ET** dans la table `affiliates`. Une fois le pont actif, il apparaîtrait 2×.

**Résolution :** retirer l'entrée `jmp-chania-tours` de `src/data/sponsored-places.json`. Il
devient un affilié géolocalisé via le pont. Le JSON `sponsored-places.json` reste **réservé aux
vrais sponsored payants** (ex. Meraki Greek Lessons), qui ne sont **pas** dans la table
`affiliates`. Filet de sécurité : au merge, dédupliquer par slug de base (si un slug existe des
deux côtés, l'affilié DB gagne).

---

## Data flow (cible, ce chantier)

```
Signup /affiliate ──► table affiliates (+lat/lng saisis à la main pour l'instant)
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                        ▼
  Email segmenté          getAffiliatePlaces()      notif Telegram (inchangé)
  (Lot 0)                 (Lot 1+2)
                                │
                                ▼
              ExploreView : marqueur ambre + fiche + CTA /go/<slug>
                                │
                                ▼
                 clic ──► /go/<slug> ──► log affiliate_clicks ──► 302 redirect_url
```

## Edge cases

- **Affilié sans lat/lng** → simplement absent de la carte (filtré). Aucune erreur.
- **Affilié `disabled`** (RoadCrete) → exclu (`status = 'active'` only).
- **Cache PostgREST périmé après migration** → `notify pgrst, 'reload schema'` + vérif REST.
- **Doublon slug sponsored/affilié** → affilié DB prioritaire au merge.
- **Photo manquante** pour un affilié → fallback icône/placeholder (le marqueur reste, la fiche
  gère l'absence de `photos[0]`).

## Testing

- **Lot 0** : test unitaire sur le corps HTML de `sendAffiliateWelcome` (présence/absence de
  « 15% » selon `category`).
- **Lot 1** : après migration, `select latitude,longitude from affiliates` via REST renvoie les
  colonnes ; les 5 affiliés ont des coordonnées plausibles (dans les bounds Crète).
- **Lot 2** : `tsc` EXIT 0 ; preview Vercel de la branche → zoom sur Chania (≥ 9) montre les
  marqueurs affiliés ; clic → `/go/<slug>` redirige (302) et logge un `affiliate_clicks`.

## Hors scope (explicite)

- **Lot 3** : formulaire de demande générique, `*_requests`, devis accepté, facturation net 15
  → rejoint le chantier **CRD multi-devis** (autre terminal).
- Géocodage automatique de l'adresse au signup.
- Champ adresse/carte ajouté au formulaire `/affiliate`.
- Dashboard affilié, preuve de clics exposée au partenaire, relances.
- Code promo consommé / redemptions.

## Contraintes repo (rappel `CLAUDE.md`)

- Branche `feat/affiliates-explore` depuis `master`. Jamais de commit direct sur `master`/`main`.
- `git add` explicite par fichier (pas de `git add -A`).
- Vert avant push : `tsc` (+ `next build` si dispo) OK.
- Git author `kerjeanfrancois29`.
- Funnel Kairos discret ; accents corrects dans toutes les langues.

---

## Lot 2.5 — Polish fiches partenaires (ajout 08/07, retours Kami sur la preview)

Après validation visuelle de la preview (4 pins OK), Kami lève 4 réserves : pin peu esthétique, pas
de photo, fiche pauvre (« Visit website » sec), et crainte que les partenaires envahissent la
colonne de gauche. Décisions prises :

- **Photo + description** : générées **automatiquement au signup** depuis le site du partenaire
  (OG image + description IA courte). 0 friction, 0 ops. Backfill des affiliés existants.
- **Gouvernance liste** : les affiliés **ne passent plus en tête** de la colonne ; triés par
  distance avec le reste (contenu = roi). Les sponsored **payants** (JSON, ex. Meraki) gardent
  leur priorité de tête (c'est leur modèle).
- **Pin** : **photo-vignette** (cercle avec la photo du partenaire + pastille or), avec fallback
  cercle-or + icône catégorie si pas de photo.

### P1 — Modèle enrichi
Migration `supabase/migrations/20260708_affiliates_content.sql` :
```sql
alter table affiliates add column if not exists photo_url   text;
alter table affiliates add column if not exists description jsonb; -- { en, fr, de, el }
```
Appliquer sur VPS + **`NOTIFY pgrst, 'reload schema'`** (piège PostgREST) + vérif REST.

### P2 — Enrichissement automatique
- Dans `api/affiliate/register/route.ts`, après l'insert (branche non-car_rental), **best-effort**
  (jamais bloquant, comme l'email) : fetch `redirect_url` → extraire `<meta property="og:image">`
  (+ fallback favicon) → `photo_url` ; générer une **description courte** (≈ 25-40 mots) en 4 langues
  (en/fr/de/el) → `description`. Si l'IA n'est pas disponible côté serverless (pas de clé Anthropic
  en env Vercel), **dégrader** : description basée sur catégorie/nom + OG image seule, et laisser
  la vraie génération IA au backfill / à un worker (documenter le TODO avec owner + butoir).
- **Backfill** `scripts/backfill-affiliate-content.mjs` (exécuté localement où l'IA est dispo) :
  remplit `photo_url` + `description` pour les affiliés actifs existants (Halepa, JMP,
  Travel in Chania, Theodosi). Traçable, idempotent.

### P3 — Carte + fiche + liste (`ExploreView.tsx`, regroupé pour éviter les conflits)
- **Pin photo-vignette** pour les affiliés (`affiliate:` slug) : cercle avec `photo_url` + pastille
  or + pointe. **Fallback** cercle-or + icône catégorie si `photo_url` absent. Réutilise le gating
  `SPONSOR_MIN_ZOOM`. Les sponsored JSON gardent leur pin actuel (ou adoptent la vignette aussi —
  au choix de l'implémenteur si trivial, sinon inchangés).
- **Fiche drawer partenaire enrichie** : photo (si dispo) + **description localisée** (`description[locale]`
  → fallback `en` → fallback catégorie) + badge Partner + CTA `/go` tracké. Fini le « Visit website »
  sec sans contexte.
- **Gouvernance liste** : dans `displayed`, séparer les `affiliate:` des `sponsor:` — les affiliés
  entrent dans le flux **trié par distance** avec `base` (calculer leur `km`), plus de préfixe de
  tête ; les `sponsor:` payants gardent le préfixe de tête. **Sur la carte, rien ne change** (les
  deux restent des pins).

### Hors scope P (rappel)
Champ photo/desc dans le formulaire public, worker d'enrichissement dédié (au-delà du TODO),
traduction au-delà de en/fr/de/el, Lot 3 (formulaire devis).
