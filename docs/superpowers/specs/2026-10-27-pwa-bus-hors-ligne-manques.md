# PWA bus hors ligne : ce qui existe, ce qui manque (27/10/2026)

Plan saison 2027, point 3 « le bus comme produit ». Relevé sur `origin/master` (`76ef4b9`),
rien de codé. Référence : `public/sw.js`, `src/components/SwRegister.tsx`,
`src/app/manifest.ts`, pages `src/app/[locale]/buses/**`.

## Ce qui existe (lot 1 app compagnon, 10/07/2026)

- `sw.js` enregistré sur toutes les pages (`SwRegister` dans le layout). Deux caches :
  `cd-bus-pages-v1` (navigations `/buses*`, network-first, repli cache) et `cd-assets-v1`
  (`/_next/static/*`, cache-first). Tout le reste est réseau pur, articles compris.
- Les horaires interurbains sont **dans le HTML** des pages (`getBusRoutes()` côté serveur,
  ISR 24 h / 48 h) : une page `/buses` ou `/buses/<paire>` déjà visitée se rouvre hors ligne
  avec ses horaires, CSS compris.
- Manifest standalone, icônes 192/512/maskable, raccourcis `/live` et `/beaches/today`,
  bannière d'installation sur les pages outils.

## Ce qui manque, par ordre d'utilité pour un voyageur sans réseau

1. **Rien n'est en cache avant la première visite.** Seule une page déjà ouverte en ligne
   existe hors ligne. Manque : pré-cache à l'activation du SW du hub `/{locale}/buses` et des
   trois pages villes (`heraklion`, `chania`, `agios-nikolaos`) pour la locale courante, plus
   un bouton « garder hors ligne » sur une page paire (`cache.add` explicite, événement
   Plausible `offline_save`).
2. **Pas de page de repli.** Une URL `/buses/<paire>` jamais visitée hors ligne jette
   `offline and not cached` : écran d'erreur du navigateur. Manque : `/offline.html` statique
   (4 locales ou neutre) pré-cachée, servie par le `catch` avec la liste des pages en cache
   (`caches.keys` + `cache.keys()`).
3. **La navigation interne échoue hors ligne.** Un clic sur un lien Next ne fait pas une
   navigation (`req.mode !== "navigate"`) mais un fetch RSC (`?_rsc=`) : non intercepté, donc
   erreur même si la page cible est en cache. Manque : soit mettre en cache les réponses
   `_rsc` des pages `/buses*` (clé par URL, même stratégie), soit forcer un `<a>` plein sur
   les liens bus quand `navigator.onLine` est faux.
4. **Aucun signal « hors ligne » dans l'interface.** L'utilisateur ne sait pas s'il lit des
   horaires frais ou mis en cache il y a huit jours. Manque : bandeau `navigator.onLine`
   + date `latestScrapedAt(routes)` déjà calculée par la page, affichée « horaires du JJ/MM ».
5. **Le live échoue en silence.** `NowPanel`, `StopSheet` et `DepartureBoard` appellent
   `/api/buses/nearest-stop` et `/api/buses/citybus-live/*` ; hors ligne le `catch` laisse
   un panneau vide. Manque : état explicite « pas de réseau, horaires théoriques » et dernier
   passage connu gardé en `sessionStorage`.
6. **Les PDF d'horaires et images ne sont pas en cache** (`/_next/image`, PDF e-ktel
   référencés sur `/buses/chania`). Mineur : les horaires sont déjà dans le HTML.
7. **Cache sans borne ni version de contenu.** `cd-bus-pages-v1` grandit sans limite et
   n'expire jamais ; une page servie hors ligne peut dater d'un mois. Manque : plafond
   (50 entrées, LRU) et purge des entrées > 14 j à l'activation.
8. **iOS** : le SW ne vit que si le site est ajouté à l'écran d'accueil (Safari 16.4+) ; la
   bannière d'installation existe mais ne dit pas « pour les horaires hors ligne ». Manque :
   un argument hors ligne dans `InstallBanner` sur `/buses*`.
9. **Aucune mesure.** Rien ne compte les pages servies depuis le cache. Manque : `postMessage`
   du SW vers la page → événement Plausible `offline_served` (props : chemin, âge du cache).

## Ordre proposé (un chantier = une branche)

- `feat/pwa-bus-offline-1` : points 2, 3, 4 (repli, RSC, bandeau) : c'est ce qui transforme
  « parfois ça marche » en « ça marche ». Testable en Playwright `context.setOffline(true)`.
- `feat/pwa-bus-offline-2` : points 1, 7, 9 (pré-cache, borne, mesure).
- Points 5, 6, 8 ensuite, selon `offline_served`.

Critère d'arrêt : si `offline_served` reste < 1 % des vues `/buses*` sur 4 semaines de saison
2027, ne pas aller au-delà du lot 1.
