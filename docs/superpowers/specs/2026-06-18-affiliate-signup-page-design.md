# Spec — Page d'affiliation self-service crete.direct (`/affiliate`)

**Date :** 2026-06-18
**Auteur :** Kami (via Claude)
**Statut :** Design validé, prêt pour plan d'implémentation
**Repo :** `cretepulse-build` (site crete.direct, Next.js 16 / App Router)

---

## 1. Objectif

Une **page unique** qu'on envoie à un partenaire potentiel (lien dans l'outreach
du sourcing autom, ou partagé direct). Elle présente le programme d'affiliation
et permet au partenaire de **s'inscrire en 3-5 clics**. À la soumission, le
système crée le partenaire, **génère immédiatement son lien affilié**
(`crete.direct/go/<slug>`) + un code promo, et les affiche. Le lien est **actif
tout de suite**.

Modèle d'affiliation : **crete.direct → partenaire**. crete.direct est
l'apporteur d'affaires (audience + fiches `/explore` + trafic), envoie ses
visiteurs vers le partenaire ; le partenaire reverse une **commission** sur les
réservations référées. La page mesure les **clics** sur le lien tracké ; la
résa réelle est réconciliée de façon **déclarative** (Kami ↔ partenaire),
hors-scope code en v1.

**Toute catégorie d'activité** est éligible (hôtel, excursion/tour, beach club,
location voiture, resto, activité… + « Autre »).

### Non-objectifs (v1)
- **Pas de tracking de conversion résa** (postback/pixel chez le partenaire) :
  on compte les clics, la résa est réconciliée à la main.
- **Pas de dashboard partenaire** (le partenaire ne se connecte pas pour voir
  ses stats) : la confirmation affiche son lien/code, c'est tout. v2.
- **Pas de paiement / facturation automatique** des commissions : process
  manuel hors plateforme en v1.
- **Pas de modération préalable** : le lien est actif dès l'inscription (cf §6).
- **Pas de traduction complète** : page EN par défaut, structure i18n prête
  (objet `T`) mais seul EN rempli en v1 (fallback EN).

---

## 2. Décisions de cadrage (actées en brainstorming)

| Question | Décision |
|---|---|
| Sens du flux | **crete.direct → partenaire** (crete.direct apporte, partenaire commissionne) |
| Finalité de l'inscription | **Activation immédiate** : lien affilié + code promo générés au submit |
| Attribution | **Lien tracké `/go/<slug>` (clics)** + réconciliation déclarative des résa |
| Catégories | **Toute activité** (liste large + « Autre ») |
| Approche technique | **A** : tout dans le site Next.js `cretepulse-build` |
| Cohabitation `/partners` | **Produit distinct, route séparée `/affiliate`**. `/partners` (slot taxi 49 €/mois, Stripe, live) **non touché** |
| Langue | **EN par défaut** (i18n extensible) |
| Statut initial | **`active`** (lien live immédiat) + notif Telegram, garde-fou désactivation |

### Pourquoi une route distincte (`/affiliate`, pas `/partners`)
`/partners` est un **autre produit** : forfait fixe 49 €/mois/zone exclusive sur
les pages bus, payé par Stripe Payment Link, ajout manuel sous 48 h
(spec `2026-06-10-taxi-partners-design.md`). Mécanique incompatible avec
l'affiliation commission self-service. On garde `/partners` intact (zéro risque
sur le produit taxi en prod) et l'affiliation vit sur sa propre route.

---

## 3. Architecture

Tout dans `cretepulse-build`. La DB est le **Postgres self-hosted VPS** exposé
en **PostgREST** (conteneurs `cretepulse-postgres` / `cretepulse-postgrest`),
accédé via le client `@supabase/supabase-js` déjà câblé
(`src/lib/supabase-admin.ts`, `supabaseAdmin`, server-only,
`SUPABASE_SERVICE_KEY` en env Vercel). C'est la même base que celle qui héberge
déjà `affiliate_prospects` (pipeline sortant) et `newsletter_subscribers`.

```
Visiteur partenaire
   │  GET
   ▼
/[locale]/affiliate  (landing + form)            ── présente le programme
   │  POST { name, category, area, email, redirect_url, accept }
   ▼
/api/affiliate/register  (route handler, server) ── valide → slug+code → INSERT affiliates
   │                                                 → notif Telegram Kami
   │  { slug, link, code, commission_pct }
   ▼
Écran « ton lien est prêt »  (rendu inline côté client)

  ── plus tard, le trafic public ──
Visiteur crete.direct → GET /go/<slug> ── INSERT affiliate_clicks (best-effort) → 302 redirect_url
```

Trois unités indépendantes, testables séparément :
1. **Landing + form** (`/[locale]/affiliate`) — présentation + capture.
2. **API register** (`/api/affiliate/register`) — logique métier (slug, code,
   insert, notif). **Hors `[locale]`** (pas de page localisée).
3. **Redirect tracké** (`/go/[slug]`) — lookup + log clic + 302. **Hors
   `[locale]`** (URL courte, partageable, stable).

---

## 4. Modèle de données (2 nouvelles tables, DB `cretepulse`)

On **ne touche pas** à `affiliate_prospects` (pipeline sortant). L'inscription
inbound crée directement un `affiliate`.

### `affiliates`
| Champ | Type | Rôle |
|---|---|---|
| `id` | uuid PK (`gen_random_uuid()`) | identifiant interne |
| `slug` | text UNIQUE | identifiant du lien `/go/<slug>` (dérivé du nom) |
| `name` | text NOT NULL | nom de l'établissement |
| `category` | text NOT NULL | hotel / tour / beach_club / car_rental / restaurant / activity / taxi / other |
| `category_other` | text | précision si `category = other` |
| `area` | text | Heraklion / Chania / Rethymnon / Lassithi / other |
| `email` | text NOT NULL | contact (+ clé anti-doublon souple) |
| `redirect_url` | text NOT NULL | cible du `/go` (URL de résa du partenaire) |
| `code_promo` | text UNIQUE | code à présenter au partenaire |
| `commission_pct` | numeric | % convenu (défaut **15**, configurable) |
| `status` | text NOT NULL default `'active'` | `active` / `disabled` |
| `prospect_id` | uuid NULL | rapprochement futur avec `affiliate_prospects` (non câblé v1) |
| `created_at` | timestamptz default `now()` | audit |

Index : PK, UNIQUE(`slug`), UNIQUE(`code_promo`), index sur `email`.

### `affiliate_clicks`
| Champ | Type | Rôle |
|---|---|---|
| `id` | bigserial PK | identifiant clic |
| `affiliate_id` | uuid FK → affiliates(id) | partenaire référé |
| `ts` | timestamptz default `now()` | horodatage |
| `referer` | text | provenance (best-effort) |
| `ua` | text | user-agent (best-effort) |
| `ip_hash` | text | **IP hachée** (SHA-256 + sel), jamais l'IP brute — RGPD |

Index : PK, index sur (`affiliate_id`, `ts`). Comptage par `GROUP BY affiliate_id`.

> SQL livré en `supabase/migrations/` (ou `db/`) selon convention du repo, à
> appliquer sur la DB `cretepulse` comme l'a été `affiliate_prospects`.

---

## 5. Les trois unités en détail

### 5.1 Landing `/[locale]/affiliate/page.tsx`
One-pager, **charte crete.direct existante** (classes `bg-surface`, `text-aegean`,
`text-text`, composants `lucide-react` — même style que `/partners`). Sections :
1. **Hero** — ce que crete.direct apporte : audience multilingue, fiches
   `/explore`, trafic qualifié. Brand voice honnête (zéro garantie de revenus).
2. **Comment ça marche** en 3 étapes (inscris-toi → reçois ton lien →
   crete.direct t'envoie des visiteurs, tu reverses une commission sur les résa).
3. **Le deal** — commission %, réconciliation transparente, sans engagement.
4. **Form** (voir 5.2) + **écran de confirmation inline** au succès.

Contenu via un objet `T` (pattern de `/partners`), **EN rempli**, fallback EN
pour fr/de/el.

### 5.2 Le form (3-5 clics)
Champs : **Nom établissement** · **Catégorie** (select, dont « Autre » →
champ texte) · **Zone** (select) · **Email** · **URL de réservation** ·
☑ **j'accepte la commission de X %**. **Honeypot** anti-bot (champ caché).

Décompte clics : catégorie (1) + zone (1) + checkbox (1) + submit (1) = 4 clics,
+ saisie nom/email/URL. ✔ dans la cible 3-5.

Au succès → écran « Your affiliate link is ready » affichant : `crete.direct/go/<slug>`
(copiable), le **code promo**, le **% commission**, et un rappel du
fonctionnement.

### 5.3 API `/api/affiliate/register/route.ts` (POST, server)
1. **Valide** : champs requis présents, `email` format, `redirect_url` =
   URL `http(s)` valide, `accept === true`, honeypot vide. Sinon `400`.
2. **Slug** : dérivé de `name` (slugify, ASCII, minuscule). Collision →
   suffixe `-2`, `-3`… (boucle de vérif d'unicité). 
3. **Code promo** : dérivé du slug en majuscules + court suffixe (unique).
4. **Insert** `affiliates` via `supabaseAdmin` (status `active`, `commission_pct`
   = défaut config).
5. **Notif Telegram** à Kami (bot/`chat_id` existants côté infra) : nom,
   catégorie, zone, email, lien généré → visibilité + lien de désactivation
   manuelle si abus.
6. **Réponse** `{ slug, link, code, commission_pct }` (ou `409` si email déjà
   inscrit — anti-doublon souple).

> Best-effort : si la notif Telegram échoue, l'inscription **réussit quand
> même** (notif loggée, non bloquante). L'insert DB, lui, est bloquant.

### 5.4 Redirect `/go/[slug]/route.ts` (GET, server)
1. Lookup `affiliates` par `slug` **et** `status = 'active'`.
2. Inconnu / désactivé → **302 vers l'accueil** crete.direct.
3. Trouvé → **INSERT `affiliate_clicks`** (best-effort : `referer`, `ua`,
   `ip_hash` ; un échec d'insert ne bloque pas la redirection) → **302** vers
   `redirect_url`.

Route **hors `[locale]`** pour une URL courte et stable.

---

## 6. Activation & garde-fou

- Inscription = **lien live immédiatement** (`status = active`). Pas de
  modération préalable (friction minimale = objectif produit).
- **Notif Telegram** systématique à chaque inscription → Kami garde la
  visibilité et peut **désactiver** un affilié (`status = disabled`) si abus
  (un slug `disabled` redirige vers l'accueil). Faible volume attendu en v1.
- **Anti-abus form** : honeypot caché + validation stricte URL/email +
  rate-limit basique par IP (best-effort) sur l'API register.

---

## 7. RGPD & sécurité

- **IP jamais stockée en clair** : `affiliate_clicks.ip_hash` = SHA-256 + sel.
- **Pas de donnée sensible exposée** : `supabaseAdmin` reste **server-only**
  (jamais importé côté client) ; `SUPABASE_SERVICE_KEY` jamais exposée.
- Email partenaire = donnée pro ; non exposée dans logs publics.
- Cohérent avec la règle data.md Kairos (ne jamais exposer de PII en output).

---

## 8. Configuration & secrets

| Élément | Variable | Statut |
|---|---|---|
| Accès DB (PostgREST) | `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_KEY` | ✅ déjà en prod (Vercel) |
| Telegram bot + chat | `TELEGRAM_BOT_TOKEN`, `TG_CHAT_ID` (ou équivalents repo) | ⚠️ à confirmer présents dans l'env Vercel `cretepulse-build` |
| Commission par défaut | `AFFILIATE_DEFAULT_COMMISSION_PCT` (ou const config) | **15 %** (acté Kami 18/06) |
| Sel de hachage IP | `AFFILIATE_IP_SALT` | nouveau |

> Dépendance restante (owner Kami) : confirmer le **bot Telegram** côté env
> Vercel (sinon notif désactivée en mode dégradé propre, l'inscription marche
> quand même). La notif est un **`sendMessage` sortant one-shot** → **pas de
> conflit 409** avec `crete-alert-gate` (le 409 ne touche que les `getUpdates`
> concurrents) : on peut réutiliser un token bot existant. SQL des 2 tables à
> appliquer sur la DB `cretepulse`. Commission par défaut **= 15 %** (actée).

---

## 9. Découpage en unités (pour le plan d'implémentation)

- `supabase/migrations/<ts>_affiliates.sql` — tables `affiliates` +
  `affiliate_clicks` + index.
- `src/lib/affiliate.ts` — pures : `slugify`, génération slug unique, code
  promo, validation payload (testables sans DB).
- `src/lib/affiliate-store.ts` — accès DB via `supabaseAdmin` (insert affiliate,
  lookup par slug, insert clic).
- `src/lib/affiliate-notify.ts` — notif Telegram (best-effort, `fetch`).
- `src/app/[locale]/affiliate/page.tsx` — landing (objet `T`, EN).
- `src/app/[locale]/affiliate/SignupForm.tsx` — form client + écran succès.
- `src/app/api/affiliate/register/route.ts` — POST register.
- `src/app/go/[slug]/route.ts` — GET redirect + log clic.
- Tests : unités pures (`affiliate.ts`) + validation API.

Ordre de build : SQL → `affiliate.ts` (pur, testé) → `affiliate-store.ts` →
`affiliate-notify.ts` → API register → landing + form → `/go` redirect.

### Conventions repo (rappel `cretepulse-build/CLAUDE.md`)
- 1 chantier = 1 branche `feat/affiliate-signup` depuis `master`. Jamais sur
  `main` (= prod, déploiement = `git push origin master:main`, acte conscient).
- `git add -A` interdit (staging explicite).
- Vert avant push : `tsc` (+ `next build` si dispo).
- Git author : `kerjeanfrancois29` (sinon Vercel bloque).
