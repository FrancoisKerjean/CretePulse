# Réduction du périmètre linguistique indexable — design

**Date** : 01/08/2026 · **Statut** : spec, aucun code écrit · **Décision de périmètre** : Francois, 01/08
**Suite de** : `2026-07-22-news-noindex-plan-b.md` (lot 1 déployé le 22/07, sans effet mesurable à J+10)

## 1. Ce qui est mesuré, et ce qui ne l'est pas

Faits vérifiés le 01/08 dans Search Console (UI + API), à ne pas re-déduire :

| Fait | Valeur | Source |
|---|---|---|
| Chute | 18/07 = 5 732 impr / 180 clics / pos 12,2 → 20/07 = 221 / 9 / pos 44,7 | GSC API, dimension `date` |
| Depuis | 357 impr/j sur 10 j contre 4 866 avant = **-93 %** | idem |
| Autres sites du compte | iletaitunfut 191 → 215 impr/j, kairosguest 364 → 447 | idem, même fenêtre |
| Actions manuelles | **Aucune** (re-vérifié le 01/08, déjà vérifié par Francois le 22/07) | GSC UI |
| Problèmes de sécurité | Aucun | GSC UI |
| Demandes de suppression | Aucune sur 6 mois | GSC UI |
| URL connues de Google | **~237 000** : 81 200 indexées + 156 000 non indexées | GSC > Indexation |
| URL déclarées au sitemap | **3 705** `<loc>` (+23 dans `sitemap-news.xml`) | GSC > Sitemaps |
| Motifs de non-indexation | noindex 77 700 · 404 19 121 · explorée non indexée 18 212 · redirections 12 295 · canonique concurrente 3 565 · 5xx 2 256 · robots.txt 1 560 · doublon 193 · soft 404 78 | GSC > Indexation |
| Échantillon des rejets | `/es/explore/korakas-gorge`, `/ja/articles/best-beaches-crete-summer`, `/cs/articles/crete-water-parks-kids`, `/ru/explore/saint-eleftherios-monastery-at-mournies`, `/no/explore/ammoudi-beach-agios-nikolaos` | GSC, exemples fournis par Google |
| Les 2 256 erreurs 5xx | **toutes** des `/ru\|fi\|da\|hu\|pt/news/*` | GSC, exemples |

⛔ **Ce que la mesure ne dit PAS** : elle n'établit pas la cause du basculement du 19/07. Elle établit une
structure — un domaine qui expose ~22 fois plus d'URL qu'il n'en déclare, dont Google rejette
massivement les variantes traduites. La spec agit sur cette structure ; elle ne prétend pas
« annuler une pénalité » dont personne ne connaît le déclencheur exact.

⚠️ Le rapport d'indexation s'arrête au 24/07/2026 (dernière mise à jour Google) : l'effet complet
de la chute n'y est pas encore visible, et l'effet du lot 1 du 22/07 non plus.

## 2. Le mécanisme, lu dans le code

Le sitemap ne déclare pas 3 705 URL à Google. Il en déclare **3 705 × 22**.

`src/app/sitemap.xml/route.ts`, fonction `urlEntry` : chaque `<url>` porte un `<loc>` en `/en/…`
**plus 22 `<xhtml:link rel="alternate" hreflang>`**, un par locale, plus `x-default`.
Soit **81 510 URL déclarées**. Google en a **81 200 dans l'index**.

La correspondance est frappante et cohérente avec le reste, mais elle reste une corrélation :
Google n'indexe pas une URL du seul fait qu'elle est déclarée. À traiter comme un faisceau, pas
comme une preuve.

Trois sources de découverte des 22 locales, et une fausse piste :

1. **`src/lib/seo.ts` → `buildAlternates(locale, path)`** boucle sur `routing.locales` (22) et
   émet les `hreflang` dans le `<head>`. **Utilisée dans 64 fichiers.** C'est le point de levier
   principal : une seule boucle à changer corrige les 64 d'un coup.
2. **`src/i18n/routing.ts` → `alternateLinks: true`** : next-intl ajoute en plus des en-têtes HTTP
   `Link: <…>; rel="alternate"; hreflang="…"` pour les 22 locales, sur chaque réponse.
3. **`src/app/sitemap.xml/route.ts` → constante `LOCALES`** (les 22, redéclarées localement).
4. ✅ **Fausse piste écartée** : le `LocaleSwitcher` de `src/components/layout/Header.tsx:79`
   change de langue par `router.replace(pathname, { locale })` dans un `onClick`, **pas par des
   `<a href>`**. Il ne produit aucun lien crawlable, donc il n'entretient pas la découverte.
   ⛔ À re-vérifier au rendu avant de conclure : si un `<Link>` s'y cache, il faudra le traiter.

## 3. Périmètre retenu

**Indexables : `en`, `fr`, `de`, `el`.** Les 18 autres restent **servies** aux utilisateurs mais
sortent de l'index et des hreflang.

Mesure GSC sur 30 j avant la chute (19/06 → 18/07), clics par préfixe de langue :

```
GARDÉ    en 1 800 · fr 1 375 · de 872 · el 83                    = 85,1 %
RETIRÉ   cs 80 · it 54 · es 51 · da 45 · ko 45 · no 44 · ru 39
         hu 35 · sv 34 · fi 31 · nl 31 · pl 25 · ro 23 · zh 20
         ar 18 · tr 17 · ja 16 · pt 14                           = 14,5 %  (~700 clics/mois)
```

`el` est gardé à 1,7 % pour la légitimité locale et le dossier B2G KTEL, pas pour son trafic.
C'est un choix assumé, pas une conséquence des chiffres.

**Cible** : ~3 705 × 4 = 14 820 URL déclarées au lieu de 81 510.

## 4. Le piège qui décide de l'architecture

⛔ **Un `noindex` ne réduit ni le crawl ni le nombre d'URL connues.** Le site a déjà **77 700 pages
en `noindex`** et Google les compte quand même dans ses 237 000. Ajouter du `noindex` sur les 18
locales sans toucher aux hreflang ne ferait donc que grossir ce compteur.

**Ce qui réduit la découverte, c'est de cesser de déclarer les URL** — hreflang du `<head>`,
en-têtes `Link`, alternates du sitemap. Le `noindex` vient en second, pour vider l'index de ce qui
y est déjà.

Second piège, propre à ce dépôt : **le `noindex` ne peut pas passer par les metadata.**
`src/app/[locale]/layout.tsx:67` déclare `robots: { index: true, follow: true }`, mais toute page
enfant qui définit sa propre clé `robots` **écrase** cet héritage — c'est déjà documenté dans
`src/lib/seo.ts` au-dessus de `INDEXABLE_ROBOTS`. **Mesuré : 23 templates enfants posent leur
propre `robots:`** (`git grep -l "robots:" -- src/app` = 24 fichiers, layout compris).

⛔ **Et `INDEXABLE_ROBOTS` n'est PAS le point commun espéré : il n'a que 2 appelants**
(`articles/[slug]`, `news/[slug]`). Les 21 autres écrivent leur objet `robots` en dur. Passer par
là obligerait à toucher 23 fichiers, avec un oubli qui échouerait **en silence** — la page
resterait indexable sans que rien ne casse.

**Le `noindex` passe donc par un en-tête HTTP `X-Robots-Tag` posé dans `src/middleware.ts`** :
un seul point de contrôle, appliqué à toutes les pages localisées quels que soient leurs metadata,
impossible à oublier sur un template. Le matcher du middleware couvre déjà tout sauf
`api|admin|go|_next|_vercel|assets`.

⚠️ **À vérifier sur une URL de test avant de généraliser** : quand une page porte à la fois
`<meta name="robots" content="index, follow">` et un en-tête `X-Robots-Tag: noindex`, la doctrine
Google est que la directive **la plus restrictive** gagne. C'est le comportement attendu ici, mais
il conditionne tout le lot : **le confirmer par `curl -I` sur une préproduction avant le déploiement**,
pas après.

## 5. Architecture retenue

Une seule source de vérité, `src/i18n/routing.ts` :

```ts
export const routing = defineRouting({
  locales: [ …les 22, inchangées… ],   // on continue de SERVIR les 18
  alternateLinks: false,               // (2) plus d'en-têtes Link 22 langues
  …
});

/** Locales exposées à l'indexation. Décision Francois 01/08/2026, cf spec. */
export const INDEXABLE_LOCALES = ["en", "fr", "de", "el"] as const;
```

Puis, dans l'ordre de dépendance :

| # | Fichier | Changement | Effet |
|---|---|---|---|
| 1 | `src/i18n/routing.ts` | ajouter `INDEXABLE_LOCALES` | source de vérité |
| 2 | `src/i18n/routing.ts` | `alternateLinks: false` | coupe les en-têtes `Link` × 22 |
| 3 | `src/lib/seo.ts` | `buildAlternates` boucle sur `INDEXABLE_LOCALES` | **64 fichiers corrigés d'un coup** |
| 4 | `src/middleware.ts` | `X-Robots-Tag: noindex, follow` si locale hors `INDEXABLE_LOCALES` | couvre **toutes** les pages des 18 locales, sans toucher un seul template |
| 5 | `src/app/sitemap.xml/route.ts` | `LOCALES` → import de `INDEXABLE_LOCALES` | 81 510 → 14 820 URL déclarées |

⚠️ **Le point 4 est celui qui décide du succès du lot.** Il tient en une dizaine de lignes mais
s'applique à chaque requête : une erreur de test de locale et c'est `en` qui passe en `noindex`.
**Le test doit couvrir les deux sens** — les 4 locales gardées ne portent jamais l'en-tête, les 18
autres le portent toujours — et le préfixe doit être lu sur le segment de chemin, pas par un
`startsWith` naïf (`/en` ne doit pas matcher `/enquete/...`).

⚠️ **Le point 3 se vérifie par un test de non-régression, pas à l'œil** : `buildAlternates` est
appelée dans 64 fichiers, la boucle change de source, un seul test sur la fonction pure suffit à
épingler les 4 sorties attendues.

⚠️ **`follow: true` est conservé partout** — comme au lot 1 du 22/07. On sort les pages de l'index
sans casser la circulation du maillage interne.

## 6. Ce que cette spec ne fait PAS

- **Pas de `410`, pas de suppression de route.** Les 18 locales continuent d'être servies : aucune
  URL en circulation ne casse, aucun backlink ne meurt. Le `410` reste en réserve
  (lot 4 de la spec du 22/07) si rien ne bouge à J+30.
- **Pas de retrait du `LocaleSwitcher`.** Un visiteur allemand qui veut lire en espagnol le peut
  encore ; simplement, Google ne se voit plus proposer 22 variantes de chaque page.
- **Pas de purge DB des news.** Hors périmètre, déjà couvert par le lot 1.
- **Pas de travail on-page bus.** Sans objet tant que le domaine est déprécié
  (cf `project_crete_direct_bus_seo.md`).

## 7. Mesure, et ce qu'on accepte de perdre

**Coût immédiat et assumé** : ~700 clics/mois, soit 14,5 % du trafic Google d'avant la chute.
Dans l'état actuel du site (18 clics/jour), c'est un coût théorique bien plus que réel.

**Attente réaliste** : le re-crawl d'un périmètre de cette taille prend **2 à 6 semaines**. Aucune
conclusion avant J+21 (22/08). Ne pas empiler un autre levier entre-temps, sinon plus rien n'est
attribuable — c'est exactement la raison pour laquelle le lot 4 du 22/07 était gardé en réserve.

**Indicateurs suivis** (tous déjà en place) :
- GSC > Indexation : les 81 200 pages indexées doivent baisser vers ~15 000, et « explorée non
  indexée » monter transitoirement (normal, c'est la file de sortie).
- Clics/impressions quotidiens, `Kairos-GateA-GSC-Check` du lundi, referral Google Plausible.
- ⛔ **Le signe de reprise n'est PAS la baisse du nombre d'URL** : c'est le retour de la position
  moyenne sous 20 sur les pages `en/fr/de/el`. Confondre les deux ferait crier victoire sur un
  simple dégonflement de compteur.

## 8. Reste à trancher avant le code

1. **`hreflang` et locales servies mais non indexées** : une page `/es/beaches` va porter un
   `canonical` vers elle-même et un `noindex`. Faut-il plutôt un `canonical` vers `/en/beaches` ?
   ⛔ Non : `canonical` + `noindex` sur la même page est un signal contradictoire connu pour être
   ignoré par Google. `noindex` seul, `canonical` self. À confirmer au moment du code.
2. **Les 3 705 `<loc>` sont tous en `/en/`** : le sitemap ne déclare aucune URL `fr`/`de`/`el` en
   `<loc>`, elles n'existent que comme alternates. Après le lot 3, `fr`/`de`/`el` restent donc
   déclarées — mais faut-il les promouvoir en `<loc>` propres ? Décision à instruire, hors lot.
