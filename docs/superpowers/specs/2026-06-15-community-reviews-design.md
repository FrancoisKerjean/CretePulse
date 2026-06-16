# Avis communautaires sur les fiches lieu — Design

Date : 2026-06-15
Projet : cretepulse-build (crete.direct)
Statut : v2 après self-review adversariale (2 angles : sécu/RGPD + cohérence repo), prêt pour review Kami

## Problème

Sur chaque fiche `/[locale]/explore/[slug]`, la tuile « note » des Bento
(`BeachBento`, `HeritageBento`, `NatureBento`, `VillageBento`, `DefaultBento`
via `shared/Tile.tsx`) montre `cb_places.rating` — note **scrapée** depuis
cretanbeaches.com, figée, sans `review_count`, jamais recalculée. Trois manques :

1. **Note morte.** Aucun moyen d'ajouter son avis ni de voir ceux des autres.
2. **Aucune autorité communautaire** : un lieu réellement excellent et un lieu
   surcoté ont la même note tant que cretanbeaches ne bouge pas.
3. **Aucune surface de conversation** sur crete.direct (les discussions vont sur
   Google Maps / TripAdvisor).

Demande Kami (15/06) : étoiles **cliquables** → page d'avis du lieu (commentaires,
formulaire, vote utile), note **dynamique et communautaire**.

## Décisions (8 verrouillées par Kami)

### Round 1 — cadrage (AskUserQuestion 15/06)
1. **Mécanique** = avis 1–5★ style Google. Note affichée = **moyenne des avis
   communautaires**. Upvotes = tri des commentaires.
2. **Identité / anti-abus** = e-mail + lien magique (réutilise l'infra
   newsletter double opt-in). **1 avis / e-mail / lieu** (`UNIQUE(slug, email)`).
3. **Modération** = publication directe + filtre auto + signalement. Pas de
   pré-modération humaine.
4. **Périmètre V1** = MVP fiche-lieu uniquement. Pas de propagation aux
   cartes/listings/tri global.

### Round 2 — défauts (AskUserQuestion 15/06 post-restart)
5. **Seuil de bascule = ≥ 1 avis publié.** Dès le premier avis confirmé, la
   tuile passe de note scrapée → note communautaire. Choix militant assumé.
   Atténuations conservatrices côté impl (cf Sécurité) : badge visuel distinct,
   rate-limit multi-axes (IP / e-mail / domaine / lieu), status intermédiaire
   `pending_review` déclenché par burst, modération admin secret rapide.
6. **Votes upvote/downvote = tri uniquement.** Anonymes (localStorage +
   ip_hash, rate-limit, anti-double device/IP). **N'affectent PAS la moyenne.**
   Seule la note 1–5★ e-mail-gated entre dans la moyenne.
7. **Modération V1 = endpoint admin protégé par secret** (curl/Postman, pattern
   `?secret=…` query param **comme `/api/revalidate` existant**, pas Bearer
   inventé). Variable d'env `REVIEWS_ADMIN_SECRET`. Pas d'UI back-office V1.
8. **Toxicité LLM repoussée en V2.** V1 = liste mots interdits hard-codée
   FR/EN/DE/EL côté Next.js + blocklist URL/spam.

## Comportement utilisateur

### 1. Tuile note de la fiche (rendu Bento)

`RatingTile` (nouveau composant wrapper) reçoit `slug`, `scrapedRating`,
`communityAvg`, `communityCount`, `locale` et décide :

- **`communityCount >= 1`** : note communautaire → `Tile big={communityAvg.toFixed(1)}
  label="Avis (n)"`, **wrappé dans `<Link href="/explore/<slug>/avis">` de
  `@/i18n/navigation`** (le locale prefix est ajouté automatiquement par
  `createNavigation(routing)`). Variant visuel **nouveau** `community` (cf
  Architecture · Tile) pour éviter la collision avec `aegean`/`sand`/`sun` déjà
  utilisés par d'autres tuiles des mêmes Bento.
- **`communityCount === 0 && scrapedRating != null && scrapedRating > 0`** :
  rendu scrapé inchangé (`Tile big={scrapedRating.toFixed(1)} label="Note"
  variant="sand"`), **pas cliquable**.
- **`communityCount === 0 && (!scrapedRating || scrapedRating === 0)`** :
  `RatingTile` retourne `null` (pas de tuile, layout grid intact comme
  aujourd'hui sur les lieux sans note).

`Tile.tsx` **n'est pas modifié** (signature inchangée, zéro régression sur
les 5 Bento). Le `<Link>` et la décision de variant vivent dans `RatingTile`.

### 2. Page d'avis `/[locale]/explore/[slug]/avis`

- En-tête : nom du lieu, moyenne (1 décimale), nombre d'avis, distribution
  1★–5★ en barres horizontales (`count(*) GROUP BY rating`).
- Liste : `<ReviewCard>` × n, triés par `(upvotes - downvotes) DESC, created_at
  DESC`. Chaque carte = note 1–5★, pseudo, date locale, commentaire (optionnel),
  boutons upvote/downvote, lien « signaler ».
- Formulaire « Laisser un avis » : `note 1-5★` (radio), `commentaire` (textarea,
  ≤ 1000 chars, optionnel), `pseudo` (≤ 40 chars), `e-mail`, honeypot
  `website`, **case consentement explicite** (pas pré-cochée, mention RGPD
  cliquable vers politique de confidentialité).
- Bouton retour vers la fiche.
- **`<meta name="robots" content="noindex,follow">`** + canonical pointant sur
  `/explore/<slug>` (voir SEO).

### 3. Dépôt d'avis (flow)

1. Submit → `POST /api/reviews/submit`.
2. **Honeypot** `website` rempli → silent success (200 `{ok: true}`, **fake-await
   50–200ms** pour matcher la latence du flow normal — anti énumération).
3. **Normalisation e-mail** : `lowercase + strip Gmail +tag` (`a+b@gmail.com` →
   `a@gmail.com`) avant tout check (évite contournement plus-addressing).
4. **Validation** :
   - `EMAIL_REGEX` (identique newsletter) + **MX lookup** côté serveur (dns.promises).
   - **Blocklist domaines jetables** (`src/lib/reviews/disposable-domains.ts`,
     liste hard-codée mise à jour mensuellement par snapshot du repo public
     `disposable-email-domains/disposable-email-domains`) → silent success.
   - `rating` ∈ [1,5], `comment.length ≤ 1000`, `author_name.length` ∈ [1,40].
5. **Filtre auto** sur `comment` et `author_name` :
   - `containsBanned()` (mots interdits FR/EN/DE/EL, match `\b`, normalisation NFD) → silent success.
   - `looksLikeSpam()` (> 1 URL, > 0 e-mail, > 50% non-alphanum) → silent success.
6. **Sanitization** : DOMPurify (`isomorphic-dompurify`) côté serveur sur
   `author_name` ET `comment` avant insert, strip tout HTML/scripts/`javascript:`.
7. **Rate-limit multi-axes** (`cb_reviews` count via ip_hash, email, slug) :
   - **5 submits / heure / ip_hash**.
   - **3 confirmations / jour / domaine e-mail**.
   - **5 confirmations / jour / e-mail global** (anti brigading positif 1
     propriétaire × 6300 lieux).
   - **20 confirmations / heure / `place_slug`** → au-delà, les nouveaux avis
     du lieu basculent automatiquement en `status='pending_review'` (visible
     uniquement pour Kami via admin, retirés de l'affichage public et de la
     moyenne tant que non validés). Notification Sentry/log.
8. **Insert / upsert `cb_reviews`** :
   - Si **aucun avis** pour `(slug, normalized_email)` : insert
     `status='pending'`, `confirm_token_hash = sha256(token)`, `delete_token_hash
     = sha256(delete_token)`, envoi e-mail magic link avec `token` et
     `delete_token` clairs.
   - Si **avis `pending` existant** (re-soumission) : **ne pas écraser**.
     Marquer l'ancien `status='expired'`, insérer un nouveau `pending` avec
     nouveaux tokens, ré-envoi e-mail. (Le clic sur un vieux lien expiré
     répond explicitement « ce lien a été remplacé, vérifie tes mails ».)
   - Si avis `published` existant : silent success **+ fake-await** identique
     à la latence d'envoi e-mail (anti énumération).
   - Si avis `removed` existant : silent success (avec autre e-mail, l'auteur
     peut re-poster — cohérent avec décision Kami, atténué par blocklist
     `cb_review_banned_emails` peuplée à chaque `remove` admin).
9. Réponse `{ok: true, requires_confirmation: true}` → UI : « Vérifie ta boîte
   mail pour publier ton avis ».

### 4. Confirmation magic link

- `GET /api/reviews/confirm?token=<uuid>` :
  - lookup par `WHERE confirm_token_hash = sha256($token)` (constant-time côté
    SQL via index hash) ;
  - si `status='pending'` : `status='published'`, `published_at=now()`,
    `confirm_token_hash = NULL`, **`revalidateTag('place-' + slug)`**
    (tag-based revalidation, voir Architecture · cache) ;
  - si `status='expired'` : redirect vers `/[locale]/explore/<slug>/avis?expired=1`,
    UI explique « ce lien a été remplacé ».
- Réponse = redirect 303 vers `/[locale]/explore/<slug>/avis?confirmed=1`.

### 5. Suppression utilisateur (droit RGPD art. 17)

- `GET /api/reviews/delete?token=<delete_token>` :
  - lookup par `WHERE delete_token_hash = sha256($token)` ;
  - `status='removed'`, `removed_at=now()`, `removed_reason='user_request'`,
    `email=''`, `delete_token_hash=NULL` (purge des PII) ;
  - `revalidateTag('place-' + slug)` ;
  - redirect vers `/[locale]/explore/<slug>?deleted=1`.
- **Si l'utilisateur a perdu l'e-mail de confirmation** : `POST
  /api/reviews/request-deletion` `{email}` → renvoie un nouveau `delete_token`
  pour chaque avis confirmé de cet e-mail (réutilise infra magic link, silent
  success si l'e-mail n'a pas d'avis).

### 6. Export utilisateur (droit RGPD art. 15)

- `GET /api/reviews/export?token=<delete_token>` : renvoie JSON des données
  associées à l'avis (rating, comment, author_name, locale, created_at,
  published_at, consent_at). Le `delete_token` sert aussi de preuve d'identité
  pour l'export (KISS, pas de second token).

### 7. Votes upvote/downvote

- Anonyme. Côté client : `localStorage` `cd-review-votes` (`reviewId →
  -1|0|1`), optimistic UI.
- `POST /api/reviews/vote` `{review_id, value: -1|0|1}` :
  - `hashIp` = `sha256(ip + REVIEWS_SALT)`, rate-limit (60 votes / h /
    ip_hash) ;
  - upsert `cb_review_votes` avec UNIQUE `(review_id, ip_hash)` → permet
    retrait (value=0 → DELETE) et changement (1 → -1).
- Compteurs servis par la **vue Postgres `cb_reviews_with_counts`** (LEFT
  JOIN `cb_review_votes` GROUP BY review_id), créée dans la migration. La
  route `/api/reviews/list` lit cette vue — pas de N+1.

### 8. Signalement

- `POST /api/reviews/report` `{review_id, reason: 'spam'|'abuse'|'offtopic'}`.
- ip_hash, rate-limit (10 reports / h / ip_hash), insert
  `cb_review_reports` UNIQUE `(review_id, ip_hash)`.
- **Auto-flag** : si `count(distinct ip_hash) >= 5` pour un même `review_id`,
  l'avis bascule `status='pending_review'` automatiquement (trigger SQL ou
  check dans la route). Retiré de l'affichage public et de la moyenne tant que
  Kami n'a pas tranché. **Important** : ce comportement n'est PAS l'auto-retrait
  refusé par Kami au round 2 (qui était sur N=3, sans status intermédiaire) —
  c'est une mise en quarantaine à seuil plus dur (N=5 distincts), récupérable
  via `/api/admin/reviews/restore`. **À valider explicitement par Kami** (la
  décision round 2 portait sur l'absence d'auto-retrait, pas sur l'absence de
  quarantaine — distinction fine, à confirmer).

## Architecture

### Données (4 tables + 1 vue Postgres VPS)

```sql
-- supabase/migrations/20260615120000_cb_reviews.sql

CREATE TABLE cb_reviews (
  id                  bigserial PRIMARY KEY,
  place_slug          text   NOT NULL,
  rating              int    NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment             text   CHECK (comment IS NULL OR length(comment) <= 1000),
  author_name         text   NOT NULL CHECK (length(author_name) BETWEEN 1 AND 40),
  email               text   NOT NULL,                    -- normalisé (lowercase + gmail strip)
  status              text   NOT NULL CHECK (status IN ('pending','published','removed','expired','pending_review')),
  confirm_token_hash  text,                                -- sha256 hex, NULL après usage
  delete_token_hash   text,                                -- sha256 hex, NULL après usage
  consent_at          timestamptz NOT NULL,
  consent_text_hash   text   NOT NULL,                     -- preuve version texte consentement
  ip_hash             text   NOT NULL,
  salt_version        int    NOT NULL DEFAULT 1,           -- voir Rotation SALT
  locale              text   NOT NULL CHECK (locale IN ('en','fr','de','el','it','nl','pl','es','pt','ru','ja','ko','zh','tr','sv','da','no','fi','cs','hu','ro','ar')),
  created_at          timestamptz NOT NULL DEFAULT now(),
  published_at        timestamptz,
  removed_at          timestamptz,
  removed_reason      text,
  UNIQUE (place_slug, email)
);
CREATE INDEX idx_cb_reviews_slug_status ON cb_reviews(place_slug, status);
CREATE INDEX idx_cb_reviews_status_created ON cb_reviews(status, created_at);
CREATE UNIQUE INDEX idx_cb_reviews_confirm_token_hash ON cb_reviews(confirm_token_hash) WHERE confirm_token_hash IS NOT NULL;
CREATE UNIQUE INDEX idx_cb_reviews_delete_token_hash ON cb_reviews(delete_token_hash)   WHERE delete_token_hash IS NOT NULL;

CREATE TABLE cb_review_votes (
  review_id   bigint REFERENCES cb_reviews(id) ON DELETE CASCADE,
  ip_hash     text   NOT NULL,
  value       int    NOT NULL CHECK (value IN (-1, 1)),
  salt_version int   NOT NULL DEFAULT 1,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (review_id, ip_hash)
);

CREATE TABLE cb_review_reports (
  review_id   bigint REFERENCES cb_reviews(id) ON DELETE CASCADE,
  ip_hash     text   NOT NULL,
  reason      text   CHECK (reason IN ('spam','abuse','offtopic')),
  salt_version int   NOT NULL DEFAULT 1,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (review_id, ip_hash)
);

CREATE TABLE cb_review_admin_log (
  id           bigserial PRIMARY KEY,
  review_id    bigint REFERENCES cb_reviews(id) ON DELETE SET NULL,
  action       text NOT NULL CHECK (action IN ('remove','restore','review_pending')),
  reason       text,
  admin_ip     text,                                       -- IP de l'admin pour forensic
  performed_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE cb_review_banned_emails (
  email_hash   text PRIMARY KEY,                           -- sha256(normalized_email)
  place_slug   text NOT NULL,                              -- ban per-place, pas global
  banned_at    timestamptz NOT NULL DEFAULT now()
);

CREATE VIEW cb_reviews_with_counts AS
SELECT
  r.*,
  COALESCE(SUM(CASE WHEN v.value =  1 THEN 1 ELSE 0 END), 0)::int AS upvotes,
  COALESCE(SUM(CASE WHEN v.value = -1 THEN 1 ELSE 0 END), 0)::int AS downvotes
FROM cb_reviews r
LEFT JOIN cb_review_votes v ON v.review_id = r.id
GROUP BY r.id;

-- RLS : revoke all from anon, grant only via service_role
ALTER TABLE cb_reviews            ENABLE ROW LEVEL SECURITY;
ALTER TABLE cb_review_votes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE cb_review_reports     ENABLE ROW LEVEL SECURITY;
ALTER TABLE cb_review_admin_log   ENABLE ROW LEVEL SECURITY;
ALTER TABLE cb_review_banned_emails ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON cb_reviews, cb_review_votes, cb_review_reports, cb_review_admin_log, cb_review_banned_emails, cb_reviews_with_counts FROM anon;
GRANT  ALL ON cb_reviews, cb_review_votes, cb_review_reports, cb_review_admin_log, cb_review_banned_emails, cb_reviews_with_counts TO service_role;
-- IMPORTANT : aucune lecture client direct. Tout passe par routes /api/reviews/*.

NOTIFY pgrst, 'reload schema';
```

Pas de touche à `cb_places` (laisse `rating` scrapé intact).

### Routes API

| Route                                | Méthode | Auth                | Rôle |
|---|---|---|---|
| `/api/reviews/list?slug=<slug>`       | GET     | publique            | Liste avis `published` via vue `cb_reviews_with_counts`, tri util-desc. **N'expose JAMAIS** `email`, `ip_hash`, `confirm_token_hash`, `delete_token_hash`, `consent_text_hash`. |
| `/api/reviews/aggregate?slug=<slug>`  | GET     | publique            | `{avg, count, distribution}` pour en-tête + RatingTile |
| `/api/reviews/submit`                 | POST    | publique            | Filtre + insert pending + magic link |
| `/api/reviews/confirm?token=<uuid>`   | GET     | publique            | Passe `published`, revalidateTag, redirect |
| `/api/reviews/delete?token=<uuid>`    | GET     | publique            | Suppression utilisateur (art. 17) |
| `/api/reviews/request-deletion`       | POST    | publique            | E-mail-based recovery du delete_token |
| `/api/reviews/export?token=<uuid>`    | GET     | publique            | Export JSON (art. 15) |
| `/api/reviews/vote`                   | POST    | publique            | Upsert `cb_review_votes` |
| `/api/reviews/report`                 | POST    | publique            | Insert `cb_review_reports` |
| `/api/admin/reviews/list?secret=…`    | GET     | `REVIEWS_ADMIN_SECRET` | Liste signalés + pending_review |
| `/api/admin/reviews/remove?secret=…`  | POST    | `REVIEWS_ADMIN_SECRET` | `{id, reason}` → `removed`, log audit, ban email_hash pour ce slug, revalidateTag |
| `/api/admin/reviews/restore?secret=…` | POST    | `REVIEWS_ADMIN_SECRET` | `{id}` → re-`published`, log audit |

**Pattern de réutilisation** : forme identique à `src/app/api/newsletter/subscribe/route.ts`
(validation JSON, honeypot `website`, `EMAIL_REGEX`, `supabaseAdmin` Proxy lazy
depuis `@/lib/supabase-admin`, rate-limit fenêtré, gestion d'erreur silencieuse).
Auth admin via `req.nextUrl.searchParams.get("secret")` aligné sur
`src/app/api/revalidate/route.ts` existant.

Magic link : nouvelle fonction `sendReviewConfirmationEmail(email,
confirm_token, delete_token, locale, placeName, slug)` ajoutée à `src/lib/email.ts`,
template multilingue (en/fr/de/el ; les 18 autres locales reçoivent l'EN, cf
i18n ci-dessous).

### Cache / fraîcheur

- **Tag-based revalidation** plutôt que `revalidatePath` :
  - Dans `src/app/[locale]/explore/[slug]/page.tsx`, le fetch d'agrégat
    s'écrit `fetch(…, { next: { tags: [\`place-\${slug}\`] } })`.
  - Routes `confirm`, `delete`, `admin/remove`, `admin/restore` appellent
    `revalidateTag(\`place-\${slug}\`)` → invalide les 22 locales en une fois
    (le tag est global, pas par-path), pas de boucle nécessaire.
- **`revalidate` de la page slug** = on **garde** `86400` (impact propagation
  diffé en cas d'échec du tag = max 24h, acceptable V1). Documenter le
  trade-off : si la fraîcheur de la tuile devient critique en prod, baisser
  à `3600` (impact build coûts Vercel à mesurer).
- **`revalidate` de la page `/avis`** : `60` (fraîcheur prioritaire sur cette
  page UGC).

### Front

#### `src/app/[locale]/explore/[slug]/avis/page.tsx` (nouveau)
- Server component, `export const revalidate = 60`.
- `generateMetadata` : `title = "Avis · <placeName> · crete.direct"`,
  `description` simple, **`robots: { index: false, follow: true }`** (UGC à
  faible signal SEO V1), `alternates: { canonical: \`/explore/\${slug}\` }`,
  pas de `languages` (chaque locale gère son canonical interne via le routing).
- Fetch en parallèle : `cb_places` + `cb_reviews_with_counts` + aggregate.
- Rend `<ReviewsPage>` (composant client) avec les data hydratées.

#### `src/components/reviews/ReviewsPage.tsx` (nouveau, client)
En-tête + liste + formulaire. État `'idle' | 'submitting' | 'check-email' |
'expired' | 'error'`. Lit query params (`confirmed`, `deleted`, `expired`)
pour banners.

#### `src/components/reviews/ReviewCard.tsx` (nouveau, client)
Note, pseudo, date locale (`Intl.DateTimeFormat(locale)`), commentaire, boutons
votes (état `localStorage` `cd-review-votes`), menu signaler.

#### `src/components/reviews/ReviewForm.tsx` (nouveau, client)
Note (5 inputs radio stylés étoile), pseudo, e-mail, textarea commentaire,
honeypot `website` (input invisible avec `tabindex=-1`/`aria-hidden`),
checkbox consentement (texte = `consent_text_hash` calculé côté serveur à la
soumission via la version stockée dans `src/lib/reviews/consent-text.ts`).

#### `src/components/explore/bento/shared/Tile.tsx` — **non modifié**
La signature existante reste intacte. Le `<Link>` et la logique communautaire
vivent dans `RatingTile`.

#### `src/components/explore/bento/shared/RatingTile.tsx` (nouveau, server-safe)
```
function RatingTile({ slug, scrapedRating, communityAvg, communityCount, locale }) {
  if (communityCount === 0 && (!scrapedRating || scrapedRating === 0)) return null;
  if (communityCount === 0) return <Tile icon="★" big={scrapedRating.toFixed(1)} label={T[locale].rating} variant="sand" className="col-span-2 md:col-span-1" />;
  return (
    <Link href={\`/explore/\${slug}/avis\`} className="col-span-2 md:col-span-1">
      <Tile icon="★" big={communityAvg.toFixed(1)} label={\`\${T[locale].reviews} (\${communityCount})\`} variant="community" />
    </Link>
  );
}
```
Le variant `community` est ajouté à `TileVariant` (cf modif ci-dessous). `Link`
de `@/i18n/navigation` (`createNavigation(routing)`).

#### `src/components/explore/bento/shared/Tile.tsx` — **modification minimale**
Une seule ligne : ajouter `"community"` au type `TileVariant` et une entrée
dans `VARIANT` :
```
community: "bg-lagoon-deep text-white border-lagoon-deep",
```
(`lagoon-deep` est le bleu profond charté crete.direct, distinct des 5
variantes actuelles utilisées dans les Bento). Aucune modif structurelle du
composant, signature inchangée.

#### `src/app/[locale]/explore/[slug]/page.tsx` (modifié)
- Ajout du fetch `aggregate(slug)` avec `next: { tags: [\`place-\${slug}\`] }`.
- Passe `communityAvg`, `communityCount` aux 5 Bento.
- Reste inchangé.

#### Branchement des 5 Bento (`BeachBento.tsx`, `HeritageBento.tsx`,
`NatureBento.tsx`, `VillageBento.tsx`, `DefaultBento.tsx`)
Remplacer la tuile rating actuelle :
```
{place.rating != null && place.rating > 0 && (
  <Tile icon="★" big={place.rating.toFixed(1)} label={bentoLabel("rating", locale)} variant="sun" className="col-span-2 md:col-span-1" />
)}
```
par :
```
<RatingTile slug={place.slug} scrapedRating={place.rating} communityAvg={communityAvg} communityCount={communityCount} locale={locale} />
```
(le `null` propre retourne quand pas de note du tout, le grid n'a pas de trou.)

### Modération / filtre auto

#### `src/lib/reviews/banlist.ts` (nouveau)
- `BANLIST: string[]` (lowercase NFD) — concat FR/EN/DE/EL insultes + spam
  patterns (`bit.ly`, `t.me/`, `wa.me/`, `whatsapp`, `viagra`, `cialis`, …).
- `containsBanned(text)` : NFD + lowercase + regex `\b`.
- `looksLikeSpam(text)` : seuils URLs/e-mails/non-alphanum.
- Tests `__tests__/banlist.test.ts` (vitest, format `describe/it/expect`
  identique aux `bento-*.test.ts` existants).

#### `src/lib/reviews/disposable-domains.ts` (nouveau)
Set des domaines jetables (snapshot du repo public, ~3000 entrées). MAJ
manuelle trimestrielle documentée dans la doc admin.

#### `src/lib/reviews/sanitize.ts` (nouveau)
- `sanitizeText(input, maxLen)` : DOMPurify (`isomorphic-dompurify`,
  dépendance nouvelle, ~30 KB gzip) avec `ALLOWED_TAGS: []`, `ALLOWED_ATTR:
  []` → strip tout HTML/JS.
- `normalizeEmail(email)` : lowercase + Gmail plus-tag strip + Gmail
  dot-strip (`a.b+c@gmail.com` → `ab@gmail.com`).
- `sanitizeAuthorName(name)` : strip retours ligne, max 40, regex
  `^[\p{L}\p{N}\p{P} ]+$` (Unicode lettres/nombres/ponctuation/espace).

#### `src/lib/reviews/sec.ts` (nouveau)
- `hashIp(ip)` = `crypto.createHash('sha256').update(ip + process.env.REVIEWS_SALT).digest('hex')`.
- `hashToken(token)` = idem (sans sel, le token est déjà secret).
- `getClientIp(req)` (priorise `x-forwarded-for` Vercel).
- `rateLimit(key, table, limit, windowSec)` : query la table cible avec filtre
  `created_at > now() - windowSec`. Sans Redis V1.
- `fakeAwaitEmail()` : `await new Promise(r => setTimeout(r, 50 + Math.random() * 150))`.

#### `src/lib/reviews/consent-text.ts` (nouveau)
Exporte `CONSENT_TEXTS: Record<locale, string>` (4 langues + fallback EN), et
`CONSENT_VERSION = 'v1-20260615'`. Le hash stocké côté Postgres = `sha256(\`\${CONSENT_VERSION}:\${CONSENT_TEXTS[locale]}\`)`.

### i18n

- Choix **assumé** : page `/avis` et `RatingTile` utilisent des tables `T`
  inline `en/fr/de/el` avec **fallback explicite `T.en`** pour les 18 autres
  locales (it/nl/pl/es/pt/ru/ja/ko/zh/tr/sv/da/no/fi/cs/hu/ro/ar). Justification :
  - `/avis` = `noindex` V1 → impact SEO multilingue négligeable.
  - `RatingTile.label` = 1 mot (« Avis (n) » / « Reviews (n) ») → en EN
    sur 18 locales acceptable pour V1.
  - Aligné avec `ExploreView.tsx` existant (même pattern).
- **À envisager V1.1 si trafic non-EN significatif** : injecter clés
  `reviews.*` dans les 22 `messages/*.json` via script (le repo a déjà
  `scripts/add-activity-nudge-i18n.mjs` réutilisable). **Documenté hors V1.**

### Variables d'env (Vercel)
- `REVIEWS_SALT` (string ≥ 32 char, sel `hashIp`).
- `REVIEWS_ADMIN_SECRET` (string ≥ 32 char, query param admin).
- `CONSENT_VERSION` (constante, hard-codée dans `consent-text.ts`).
- Réutilise `SUPABASE_SERVICE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `RESEND_*`.

### Cron de purge (Vercel cron, V1 obligatoire)

`vercel.json` (ajout) :
```
{
  "crons": [
    { "path": "/api/cron/reviews-cleanup", "schedule": "0 3 * * *" }
  ]
}
```

`src/app/api/cron/reviews-cleanup/route.ts` (nouveau, auth par
`process.env.CRON_SECRET` standard Vercel) :
- DELETE `cb_reviews WHERE status='pending' AND created_at < now() - interval '7 days'`.
- DELETE `cb_reviews WHERE status='expired' AND created_at < now() - interval '30 days'`.
- DELETE `cb_review_votes WHERE created_at < now() - interval '90 days'` (purge
  ip_hash anciens pour limiter rétention).
- DELETE `cb_review_reports WHERE created_at < now() - interval '90 days'`.

## Sécurité / anti-abus (résumé)

- **Honeypot** silent success + fake-await (anti énumération).
- **MX lookup** + **blocklist domaines jetables** côté submit.
- **Rate-limit multi-axes** :
  - 5 submits/h/ip_hash.
  - 3 confirmations/jour/domaine e-mail.
  - 5 confirmations/jour/e-mail global (anti brigading positif).
  - 20 confirmations/h/`place_slug` → `pending_review` auto.
  - 60 votes/h/ip_hash, 10 reports/h/ip_hash.
- **`UNIQUE(slug, email)`** + `cb_review_banned_emails` (per-slug).
- **Token storage** : `sha256(token)` stocké, jamais le token clair → fuite DB
  inexploitable.
- **DOMPurify** server-side sur `author_name` ET `comment`.
- **CSP** `default-src 'self'` sur `/avis` (en complément de la sanitization).
- **CSRF** : routes POST exigent `Content-Type: application/json`, pas de
  cookie de session → vecteur CSRF classique fermé.
- **Salt rotation** :
  - Colonne `salt_version` sur `cb_reviews`, `cb_review_votes`, `cb_review_reports`.
  - Lookup ip_hash filtre `WHERE salt_version = CURRENT_SALT_VERSION`.
  - Procédure documentée : pour rotater, (1) push nouveau salt avec
    `CURRENT_SALT_VERSION += 1`, (2) attendre 90j (purge auto via cron des
    anciens hash via leur âge), (3) ne **jamais** rotater sans cette fenêtre.
- **Quarantaine pending_review** (auto-trigger sur burst ou 5 signalements
  distincts) ≠ auto-retrait : récupérable, jamais affichée publiquement
  pendant la quarantaine. **À valider Kami** (cf Décision 5 atténuations).

## RGPD

- **Base légale** : consentement explicite art. 6.1.a RGPD, case à cocher non
  pré-cochée, texte daté (`CONSENT_VERSION` + `consent_text_hash` stockés).
- **Responsable de traitement** : Kairos (NovAI SASU) — à mentionner dans la
  politique de confidentialité du site.
- **Contact DPO** : `dpo@crete.direct` (alias à créer) — à mentionner pareil.
- **Données collectées** : `email` (normalisé), `author_name`, `comment`,
  `rating`, `ip_hash` (pseudonymisé), `consent_at`, `consent_text_hash`,
  `locale`.
- **Durée de conservation** :
  - `email` : jusqu'à suppression utilisateur OU 3 ans après dernière activité.
  - `ip_hash` : 90 jours via cron purge (`cb_review_votes` et `cb_review_reports`).
  - Avis `published` : pas de limite (utilité publique de la note communautaire),
    mais l'utilisateur peut supprimer à tout moment (art. 17).
- **Droits utilisateur** :
  - Art. 15 (accès) : `/api/reviews/export?token=`.
  - Art. 17 (effacement) : `/api/reviews/delete?token=` + recovery via
    `/api/reviews/request-deletion`.
  - Art. 20 (portabilité) : couvert par `export` (JSON, format ouvert).
  - Art. 21 (opposition) : silencieux V1 (réclamation par e-mail DPO).
- **Transferts hors UE** : Vercel = US (DPA Vercel signé, clauses
  contractuelles types). Sentry → région UE (`sentry.io/eu`). Resend → DPA. PostgREST
  VPS = OVH (UE, à confirmer). **À documenter dans la politique de
  confidentialité.**
- **Mention politique de confidentialité** à mettre à jour V1 : section
  « Avis communautaires » (collecte, finalité, durée, droits, contact).
- **Pas de fuite `removed`** : la liste publique ne sert que `published`,
  RLS verrouille les autres statuts.

## SEO

- **`/[locale]/explore/[slug]/avis`** : `<meta robots="noindex,follow">`,
  canonical vers `/explore/<slug>`, **pas d'ajout au sitemap**.
- **Tuile RatingTile** côté `/explore/<slug>` : la moyenne dynamique est dans
  le HTML rendu (ISR 86400) → utilisable par Googlebot mais pas marquée
  schema.org/Review V1 (V2 envisageable si la note communautaire devient
  signal de confiance fort).
- `generateMetadata` minimal sur `/avis` (titre + noindex + canonical).

## Hors périmètre V1

- **Modification d'un avis confirmé.** L'utilisateur supprime + re-soumet s'il
  veut changer.
- **Réponses / threads** sous les avis.
- **Propagation note communautaire aux listings/cartes/tri global.**
- **UI back-office modération.**
- **Toxicité LLM** (décision Kami 8).
- **Auto-retrait sur N signalements (sans quarantaine intermédiaire).**
  Décision Kami round 2. `pending_review` à seuil 5 est une **quarantaine**
  récupérable, pas un retrait — distinction à valider Kami.
- **Captcha Turnstile.** Repoussé V1.1 si volume d'abus observé.
- **Filtre par langue** sur la liste des avis (V2).
- **Schema.org `Review`** sur la fiche slug (V2).
- **2FA / IP allowlist admin** (V2).
- **i18n profonde 22 langues** sur `/avis` (V1.1 si trafic non-EN significatif).
- **Auto-MAJ blocklist domaines jetables.** Trimestriel manuel V1.
- **`cb_places` mise à jour** : intentionnellement intacte.

## Cas limites

- **Rating 0 ou null + 0 avis** : `RatingTile` retourne `null`, layout grid
  intact.
- **Trolling 1★ unique** : assumé (décision 5). Atténué par rate-limit
  multi-axes + signalement → quarantaine `pending_review` à 5 ip_hash
  distincts + modération admin secret.
- **E-mail invalide / boîte pleine** : `pending` purgé à J+7 par cron.
- **`revalidateTag` échoue** : ISR rattrape ≤ 24h (acceptable V1).
- **`SUPABASE_SERVICE_KEY` absente en local** : `supabaseAdmin` Proxy lève au
  premier appel (acceptable, identique à l'existant).
- **2 confirmations concurrentes du même token** : `UPDATE ... WHERE
  confirm_token_hash=$1` atomique.
- **Token compromis (fuite DB)** : tokens hashés, attaquant ne peut pas
  reconstruire le clair → inexploitable.
- **Rotation `REVIEWS_SALT`** : procédure `salt_version` documentée
  (Sécurité).
- **Magic link tardif / re-soumis** : ancien `pending` → `expired`, nouveau
  `pending` créé. Clic vieux lien = redirect explicite avec message.
- **Locale du commentaire ≠ locale de la fiche** : pas de filtre V1 (tous
  affichés, V2 introduit filtre).
- **Bot qui contourne honeypot** : rate-limit ip_hash + e-mail global + lieu
  coupe l'attaque.
- **Trigger `pending_review` faux positif** : `/api/admin/reviews/restore`
  restaure (log audit conservé).
- **`removed` puis re-poste avec autre e-mail** : peut passer, mitigation
  via `cb_review_banned_emails` (peuplée à chaque remove admin → bloque
  l'`email_hash` normalisé pour ce slug).

## Tests

- **Type/build** : `npx tsc --noEmit` + `next build` propres.
- **Unitaires (vitest)** :
  - `banlist.test.ts` : `containsBanned`, `looksLikeSpam`.
  - `sanitize.test.ts` : `normalizeEmail` (Gmail dot + plus), `sanitizeText`
    (XSS payloads), `sanitizeAuthorName` (caractères Unicode autorisés).
  - `sec.test.ts` : `hashIp` déterministe et change avec sel.
  - `aggregate.test.ts` : moyenne, count, distribution sur fixtures.
- **Manuel (Playwright preview Vercel)** :
  1. Soumission valide → e-mail → confirm → avis visible.
  2. Tuile bascule scrap → communautaire après 1er avis confirmé
     (`revalidateTag` OK).
  3. Re-soumission par même e-mail → ancien `expired`, nouveau lien envoyé.
  4. Mot interdit → silent success, rien en DB.
  5. Honeypot rempli → silent success, latence ~50–200ms (timing-safe).
  6. Vote up + re-clic → 0 (DELETE).
  7. 5 signalements distincts → avis basculé `pending_review`, disparait
     liste publique. Admin restore → réapparait.
  8. Magic link consommé deux fois → 2e clic idempotent.
  9. Suppression utilisateur via lien e-mail → avis disparait, `email` vidé.
  10. `request-deletion` sans avis → silent success (anti énumération).

## Fichiers

### Nouveaux
- `supabase/migrations/20260615120000_cb_reviews.sql`
- `vercel.json` (ajout `crons` ou MAJ si existant)
- `src/app/[locale]/explore/[slug]/avis/page.tsx`
- `src/app/api/reviews/list/route.ts`
- `src/app/api/reviews/aggregate/route.ts`
- `src/app/api/reviews/submit/route.ts`
- `src/app/api/reviews/confirm/route.ts`
- `src/app/api/reviews/delete/route.ts`
- `src/app/api/reviews/request-deletion/route.ts`
- `src/app/api/reviews/export/route.ts`
- `src/app/api/reviews/vote/route.ts`
- `src/app/api/reviews/report/route.ts`
- `src/app/api/cron/reviews-cleanup/route.ts`
- `src/app/api/admin/reviews/list/route.ts`
- `src/app/api/admin/reviews/remove/route.ts`
- `src/app/api/admin/reviews/restore/route.ts`
- `src/components/reviews/ReviewsPage.tsx`
- `src/components/reviews/ReviewCard.tsx`
- `src/components/reviews/ReviewForm.tsx`
- `src/components/explore/bento/shared/RatingTile.tsx`
- `src/lib/reviews/banlist.ts`
- `src/lib/reviews/disposable-domains.ts`
- `src/lib/reviews/sanitize.ts`
- `src/lib/reviews/sec.ts`
- `src/lib/reviews/aggregate.ts`
- `src/lib/reviews/consent-text.ts`
- `src/lib/reviews/__tests__/banlist.test.ts`
- `src/lib/reviews/__tests__/sanitize.test.ts`
- `src/lib/reviews/__tests__/sec.test.ts`
- `src/lib/reviews/__tests__/aggregate.test.ts`

### Modifiés
- `src/components/explore/bento/shared/Tile.tsx` (ajout variant `community`
  uniquement, signature inchangée)
- `src/components/explore/bento/BeachBento.tsx`, `HeritageBento.tsx`,
  `NatureBento.tsx`, `VillageBento.tsx`, `DefaultBento.tsx` (remplacer
  `<Tile rating>` par `<RatingTile>`)
- `src/app/[locale]/explore/[slug]/page.tsx` (fetch `aggregate` avec
  tags, passe au Bento)
- `src/lib/email.ts` (ajout `sendReviewConfirmationEmail`)
- `package.json` (ajout dep `isomorphic-dompurify`)

### Variables Vercel à créer
- `REVIEWS_SALT` (≥ 32 char)
- `REVIEWS_ADMIN_SECRET` (≥ 32 char)
- `CRON_SECRET` (si pas déjà défini par Vercel auto)

### Politique de confidentialité (hors repo, à MAJ par Kami)
Section « Avis communautaires » : collecte, finalité, durée, droits, contact DPO.

## Points à valider explicitement par Kami avant plan

1. **Quarantaine `pending_review` à 5 signalements distincts** : est-ce
   compatible avec la décision round 2 d'absence d'auto-retrait ? (Spec
   l'interprète comme « pas d'auto-retrait définitif » et propose une
   quarantaine récupérable.)
2. **Variant Tile `community` couleur `lagoon-deep`** : OK ou autre teinte
   préférée pour la distinction visuelle ?
3. **`/avis` noindex V1** + i18n 4 langues + fallback EN : OK pour assumer
   l'impact SEO 18 langues ?
4. **`revalidate=86400` conservé sur fiche slug** : OK ou baisser à 3600 ?
5. **Cron purge V1 obligatoire** (`0 3 * * *`) : OK ?
6. **Dépendance `isomorphic-dompurify`** : OK pour l'ajouter au bundle ?
