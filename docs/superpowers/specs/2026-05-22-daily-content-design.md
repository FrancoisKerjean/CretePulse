# Design — Contenu éditorial quotidien crete.direct (récap actus + bulletin météo)

Date : 2026-05-22
Statut : validé en brainstorming, à transformer en plan d'implémentation

## Objectif

Produire automatiquement deux contenus éditoriaux datés par jour, pour alimenter le
levier 100 % Google organique / AEO de crete.direct (cf `project_crete_direct.md`
Phase 2) :

1. **Matin** — un bulletin météo éditorial du jour pour la Crète.
2. **Soir** — une synthèse des actualités majeures du jour.

Ce sont des pages fraîches, datées, uniques chaque jour : exactement le type de contenu
que Google indexe (vs le programmatique mince). Pas de distribution manuelle (Kami a
écarté tout canal social), pas de newsletter ni Telegram pour ce MVP : 100 % pages web.

## Décisions de cadrage (brainstorming 2026-05-22)

| Sujet | Décision |
|-------|----------|
| Destination | Pages web crete.direct uniquement (SEO/AEO) |
| Langues | **EN seul** d'abord (MVP, valider l'indexation avant de traduire) |
| Sélection des actus « majeures » | **Claude juge éditorialement** (pas de clustering préalable) |
| Périmètre météo | Bulletin **Crète entier**, éditorial, avec nuances régionales |
| Index `/articles` | Posts quotidiens **exclus** de l'index guides + **hub(s) dédié(s)** + sitemap + liens internes |

## Principe directeur : réutilisation maximale

Aucune nouvelle table, aucune nouvelle route de rendu d'article.

- **Stockage** : table `guides` existante (champs `slug`, `format`, `category`,
  `keywords[]`, `titles{}`, `meta_descs{}`, `contents{}` JSONB par locale, `faqs{}`,
  `image_url`, `read_time`, `status`, `published_at`). On ajoute deux catégories :
  `daily-news` et `daily-weather`.
- **Rendu** : route existante `/[locale]/articles/[slug]` (schema.org Article, OG image,
  FAQ, articles liés par catégorie, liens internes). Pour le MVP EN, on remplit seulement
  le champ `en` de chaque dictionnaire localisé.
- **Génération** : `claude -p` (OAuth VPS, **zéro token**), modèle `sonnet`, avec le
  pattern de retry sur JSON malformé déjà présent dans `guide-writer.py`
  (`call_claude_json()`).
- **Diffusion** : `vps/indexnow.py` déjà câblé ; ping à chaque insertion via
  `indexnow.guide_urls(slug)`.

## Composants

### 1. `vps/daily-weather.py` — bulletin météo du matin

**Cron proposé** : `30 6 * * *` (06:30 Europe/Athens) — ajustable.

Flux :
1. Fetch Open-Meteo **prévision journalière** pour les 10 villes de référence (mêmes
   coordonnées que `weather.py`) + l'API marine : `temperature_2m_max/min`,
   `precipitation_sum`, `wind_speed_10m_max`, `uv_index_max`, `weather_code`,
   `sea_surface_temperature`, `wave_height`. (`weather_cache` ne stocke que le *current*,
   donc le script fait son propre fetch `daily=`.)
2. Construit un bloc de données compact (par ville + agrégat île).
3. `claude -p sonnet` rédige un bulletin EN éditorial : vue d'ensemble île, contraste
   nord/sud, montagnes, état de la mer / vent / UV, verdict baignade, conseil pratique du
   jour, + 3-4 FAQ. Sortie JSON `{title, meta_desc, content (HTML), faq[], read_time}`.
4. Insert dans `guides` : `slug = crete-weather-YYYY-MM-DD`, `category = daily-weather`,
   `format = "weather-bulletin"`, `status = published`, champs EN remplis.
5. Ping IndexNow.

### 2. `vps/daily-news.py` — récap actus du soir

**Cron proposé** : `0 20 * * *` (20:00 Europe/Athens) — ajustable, après que `news.py`
et `writer-v2.py` aient tourné dans la journée.

Flux :
1. Query `news` du jour (fenêtre `published_at`/`created_at` >= début de journée Athens),
   colonnes `slug, title_en, summary_en, source_name, category`. Réutilise les news déjà
   réécrites/traduites en EN par `writer-v2.py`.
2. `claude -p sonnet` reçoit la liste, **sélectionne 5-7 actus majeures** (tourisme,
   transport, météo extrême, culture/événements, économie locale ; écarte faits divers,
   politique nationale, sport) et rédige une synthèse EN 400-600 mots. Chaque actu citée
   renvoie en **lien interne** vers son article `/news/[slug]`. + 3-4 FAQ. Sortie JSON
   identique au bulletin.
3. Insert dans `guides` : `slug = crete-news-recap-YYYY-MM-DD`, `category = daily-news`,
   `format = "news-recap"`, `status = published`, champs EN.
4. Ping IndexNow.

### 3. Front — exclusion de l'index + hub dédié

- **Exclure** les catégories `daily-news` / `daily-weather` de l'index guides, **sans**
  casser leur présence dans le sitemap. Approche retenue pour éviter l'ambiguïté :
  ajouter à `getPublishedGuides` un paramètre d'exclusion de catégories (ou une fonction
  soeur `getEditorialGuides`) utilisé **uniquement** par `/[locale]/articles/page.tsx` ;
  le sitemap et le hub continuent de voir toutes les catégories via une requête dédiée.
  Ne jamais filtrer les `daily-*` au niveau d'une fonction partagée par le sitemap.
- **Hub `/[locale]/daily`** : page listant les deux flux en anti-chronologique (récaps
  actus + bulletins météo), avec pagination simple. Liens internes : le récap pointe vers
  `/news` (et les articles cités), le bulletin pointe vers `/weather`.
- **Sitemap** : inclure les URLs `daily-*` (réutiliser le mécanisme guides ; vérifier
  qu'elles entrent bien dans le sitemap servi).
- **i18n** : nouvelles clés de libellés pour le hub (titre, sous-titre) en EN (les autres
  langues suivront avec la traduction du contenu).

## Robustesse (règle anti-page-mince Kami)

- **Idempotence** : `slug` daté + contrainte `UNIQUE` sur `guides.slug` → un re-run le même
  jour skip proprement (check existence avant insert, ou `ON CONFLICT DO NOTHING`).
- **Jour sans news** (rare) : **ne pas publier** de récap plutôt qu'un digest vide.
- **Trop peu de news (< seuil, ex 3)** : skip également, on ne fabrique pas du remplissage.
- **Open-Meteo indisponible** : retry court puis skip — jamais de bulletin sans données.
- **JSON Claude malformé** : retry (pattern `guide-writer.py`) puis skip avec log + alerte
  Telegram via `telegram.py` (déjà câblé).
- Contenu volontairement substantiel (synthèse + FAQ) pour passer le filtre de qualité
  Google et ne pas créer de pages minces.

## Tests avant mise en production

1. Mode `--dry-run` sur chaque script : print du contenu généré, **aucune** insertion DB.
2. Run manuel réel 1× par script → vérifier la ligne `guides` insérée.
3. Vérif rendu local : `npm run dev`, ouvrir `/en/articles/crete-weather-YYYY-MM-DD` et
   `/en/articles/crete-news-recap-YYYY-MM-DD` → contenu, FAQ, schema.org Article présent,
   liens internes valides.
4. Vérif hub `/en/daily` (deux flux listés, exclusion confirmée de `/en/articles`).
5. Vérif IndexNow (HTTP 200/202).
6. Seulement ensuite : poser les deux crons sur le VPS.

## Hors périmètre (YAGNI)

- Traduction multilingue (22 langues) : phase 2, après validation indexation EN.
- Distribution Telegram / newsletter / réseaux sociaux.
- Image IA générée par bulletin (réutiliser une image statique par catégorie au début).
- Clustering/scoring d'importance des news (Claude juge directement).

## Fichiers touchés

Nouveaux :
- `vps/daily-weather.py`
- `vps/daily-news.py`

Modifiés :
- `src/lib/guides.ts` (exclusion catégories `daily-*`)
- `src/app/[locale]/articles/page.tsx` (si filtre côté page)
- `src/app/[locale]/daily/page.tsx` (nouveau hub)
- sitemap (inclusion `daily-*`)
- fichiers i18n (clés hub EN)
- crontab VPS (2 entrées)
