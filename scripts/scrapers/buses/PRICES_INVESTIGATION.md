# Investigation prix herlas — décision plan A/B

Date : 10/06/2026 · Contexte : spec `docs/superpowers/specs/2026-06-10-bus-journey-planner-design.md`

## Plan A : API billetterie officielle — testé, rien d'exploitable

Ce qui a été testé (10/06/2026) :

1. **Pages détail timetables** (`/en/timetables?ds=<fromID>,<toID>`) :
   site Next.js **App Router** (`self.__next_f`, pas de `__NEXT_DATA__`, donc
   pas de `_next/data/<buildId>/...json`). Le HTML rendu (345 Ko) ne contient
   ni `price`, ni `fare`, ni `timologio` ; le seul `€` est un lien excursion
   ctrs.gr. Les horaires sont là, les prix non.
2. **Routes API exposées** : aucun chemin `/api/` dans le HTML.
3. **Billetterie en ligne** : aucune. `/en/tickets` ne liste que les
   réductions (étudiants, etc.). Les seuls liens "tickets" pointent vers
   l'agence de voyage ctrs.gr (avion/bateau), pas les bus.
4. **Sous-domaines évidents** : `api.`, `tickets.`, `eshop.`, `app.`,
   `booking.ktelherlas.gr` → aucun DNS.
5. L'appli mobile (`gr.ktelherlas.app`) a forcément un backend, mais il
   n'est pas découvrable proprement depuis le site ; le rétro-engineering
   de l'APK est hors périmètre.

**Décision : plan B** (validé Kami 10/06/2026) — table curée pour les
liaisons principales + estimation au km flaggée `price_estimated=true`.
`fetch_official_fares()` dans `prices.py` retourne `{}` ; si un endpoint
officiel apparaît un jour, c'est le seul point à implémenter.

## Prix curés, sources

(Rempli en Task 3 du plan — tableau liaison / prix / source / date.)
