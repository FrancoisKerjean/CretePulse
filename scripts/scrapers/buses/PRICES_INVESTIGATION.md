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

Règle : seules les valeurs **sourcées** entrent dans `CURATED_PRICES`
(`price_estimated=false`). Tout le reste passe par l'estimation au km
(`price_estimated=true`, mention « indicatif » dans l'UI).

Sources consultées le 10/06/2026 :
- **[G-H]** greeka.com/crete/heraklion/car-bus/ (grille suburbaine KTEL Héraklion)
- **[G-L]** greeka.com/crete/lassithi/car-bus/ (liaisons depuis Agios Nikolaos)
- **[EKTEL]** grille `CURATED_EKTEL` du scraper (e-ktel officiel, déjà en DB)

Les noms suivent l'orthographe des `from_place`/`to_place` en DB.

| Liaison | Prix € | Source |
|---|---|---|
| Heraklion ↔ Kokkini Hani | 2.10 | G-H |
| Heraklion ↔ Malia | 4.20 | G-H |
| Heraklion ↔ Matala | 8.50 | G-H |
| Heraklion ↔ Chania | 15.00 | EKTEL (G-H dit 16.00 ; on aligne sur l'opérateur) |
| Heraklion ↔ Rethymno | 8.00 | EKTEL (G-H dit 9-16 ; on aligne sur l'opérateur) |
| Heraklion ↔ Agios Nikolaos | 7.80 | G-H |
| Heraklion ↔ Ierapetra | 12.00 | G-H |
| Heraklion ↔ Siteia | 16.00 | G-H |
| Heraklion ↔ Moires | 6.00 | G-H |
| Heraklion ↔ Agia Galini | 8.80 | G-H |
| Heraklion ↔ Tympaki | 7.50 | G-H |
| Heraklion ↔ Anogeia | 4.20 | G-H |
| Heraklion ↔ Kalessa | 2.00 | G-H |
| Heraklion ↔ Stayrakia | 2.00 | G-H |
| Heraklion ↔ Ano Asites | 2.90 | G-H |
| Heraklion ↔ Prinias | 3.50 | G-H |
| Heraklion ↔ Prof.Ilias | 2.30 | G-H |
| Heraklion ↔ Rodia | 2.10 | G-H |
| Heraklion ↔ Dafnes | 2.80 | G-H |
| Heraklion ↔ Ano Archanes | 2.10 | G-H |
| Heraklion ↔ Arkalochori | 4.00 | G-H |
| Heraklion ↔ Ano Viannos | 7.60 | G-H |
| Heraklion ↔ Mesochorio | 5.70 | G-H (ligne Mesochorio–Asimi) |
| Heraklion ↔ Asimi | 5.70 | G-H (ligne Mesochorio–Asimi) |
| Heraklion ↔ Sgoyrokefali | 2.30 | G-H |
| Agios Nikolaos ↔ Kalo Chorio Lasithioy | 2.00 | G-L |
| Agios Nikolaos ↔ Ierapetra | 4.10 | G-L |
| Agios Nikolaos ↔ Siteia | 8.30 | G-L |

Écartés faute de source ferme (→ estimation au km) : Heraklion↔Hersonisos,
↔Stalida ; Agios Nikolaos↔Eloynta, ↔Kritsa ; Ierapetra↔Makry Gyalos,
↔Myrtos, ↔Siteia. Greeka ne donne que des fourchettes ou rien.
