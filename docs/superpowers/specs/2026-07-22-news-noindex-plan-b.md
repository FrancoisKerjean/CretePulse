# Plan B — Élagage/noindex du cluster news (préparé 22/07/2026, NON déclenché)

## Contexte et déclencheur

Effondrement Google site-wide le 19/07/2026 (~-95% clics/impressions GSC, referral Google
Plausible 336/j → 6/j), coïncidant avec l'update Google non confirmé du week-end 18-19/07.
Vérifié : aucune action manuelle GSC, aucun problème de sécurité, pages indexées, crawl
actif, robots/canonical sains. Hypothèse de travail : dévaluation qualité site-level de
type « scaled content abuse » déclenchée par le cluster news.

**Condition de déclenchement : le trafic Google n'est pas revenu au 01/08/2026.**
Décision : Kami. Ne RIEN déployer avant.

## Les chiffres qui dimensionnent le problème (audit 22/07)

| Métrique | Valeur |
|---|---|
| Articles news en base (table `news`) | 34 669 (depuis le 08/04, ~390/jour) |
| Articles > 30 jours | 22 152 |
| Slugs avec ≥ 1 impression GSC (90 j) | 4 562 (13 %) |
| Slugs avec ≥ 1 clic GSC (90 j) | 1 413 (4 %) |
| Pages avec ≥ 5 clics (90 j) | 202 |
| Clics news 90 j | 4 930 (concentration : top 200 pages = 49 %) |

**~87 % du stock news n'a jamais eu une impression en 90 jours.** Pur poids mort :
budget crawl consommé + empreinte « contenu généré en masse » maximale, valeur nulle.

## Lot 1 — noindex par âge (le cœur, ~30 min de dev)

Fichier : `src/app/[locale]/news/[slug]/page.tsx` (~ligne 42). La logique robots existe
déjà (`isNewsTranslated(item, locale) ? INDEXABLE_ROBOTS : {index:false, follow:true}`).
Ajouter une condition d'âge :

```
noindex si published_at < now() - 30 jours
```

- La news est périssable par nature : après 30 j, la valeur résiduelle est quasi nulle
  (les 202 pages ≥ 5 clics sont presque toutes récentes, trafic événementiel).
- `follow: true` conservé : le maillage interne continue de circuler.
- Pas de whitelist v1 (simplicité) ; si on veut préserver des evergreen gagnants,
  exporter les slugs ≥ 5 clics 90 j et les exclure de la règle (v2, optionnel).
- Zéro migration DB. Pages ISR : la bascule noindex se propage au fil des revalidations
  → prévoir un revalidate forcé ou attendre le cycle 48 h.

## Lot 2 — vérifications périmètre (déjà sain, à confirmer au déclenchement)

- Sitemap : `fetchSlugsWithDate("news", ...)` limite déjà aux **500 dernières** news
  (`src/app/sitemap.xml/route.ts` l.110-117). RAS.
- `sitemap-news.xml` : ~26 URLs récentes. RAS.
- Vérifier qu'aucun autre template ne linke massivement les vieilles news (hub /news,
  pagination profonde) — si pagination profonde indexable, la noindexer aussi.

## Lot 3 — réduire la cadence de production (décision produit Kami)

~390 articles/jour est la signature « scaled content » la plus visible. Options :
- (a) seuil qualité : ne publier que les articles avec score de pertinence Crète élevé ;
- (b) cap volumétrique : ~30-50/jour, priorité urgences (`is_urgent`) + catégories fortes ;
- (c) statu quo volume mais fenêtre indexable 30 j (lot 1 seul).
Recommandation : (b) + lot 1. Implémentation : `/opt/cretepulse/news.py` (VPS, cron /30 min).

## Lot 4 — phase 2 agressive (seulement si pas de reprise à J+30 du lot 1)

Suppression dure (410) des articles > 60 j ET 0 clic connu, purge DB progressive.
Ne pas faire en même temps que le lot 1 (impossible d'attribuer l'effet sinon).

## Mesure

- `Kairos-GateA-GSC-Check` (lundi 09:00, recréée 22/07) : suivi bus = thermomètre du
  cluster légitime.
- Relevé quotidien clics/impr GSC + referral Google Plausible (les scripts d'audit :
  `~/.claude/scripts/tmp-gsc-full-audit.mjs`, `tmp-gsc-collapse.mjs`, `tmp-gsc-news-audit.mjs`).
- Attente réaliste post-noindex : re-crawl massif 2-6 semaines avant réévaluation qualité.
