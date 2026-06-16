<!-- scripts/scrapers/buses/README-gtfs-feed.md -->
# GTFS étape C - assemblage + validation du flux

Spec : `docs/superpowers/specs/2026-06-16-gtfs-feed-assembly-design.md`
Plan : `docs/superpowers/plans/2026-06-16-gtfs-feed-assembly.md`

## Build (run réel, owner Kami sur VPS)

```python
from supabase import create_client
from gtfs_feed_build import build_gtfs_feed, make_osrm_fetch

sb = create_client(URL, SERVICE_KEY)
# window = fenêtre de validité bornée (saison courante) ; seasons = libellés actifs
stats = build_gtfs_feed(
    sb,
    window=("20260601", "20260930"),     # à caler sur la saison en cours
    feed_version="2026-06-16",            # horodatage du build
    osrm=make_osrm_fetch(),               # km routiers (sinon fallback haversine)
    seasons=["high"],                     # None = toutes saisons (loggué)
)
print(stats)   # corridors / trips / stop_times / dropped_trips / skipped_intermediates
```

Sortie : `out/gtfs/{agency,routes,trips,stop_times,calendar,feed_info,stops}.txt`,
`out/gtfs/crete.zip`, `out/gtfs/build-feed-stats.json`.

## Sanity check (sans Java)

```
node scripts/check-gtfs-feed.mjs scripts/scrapers/buses/out/gtfs
```

## Validation officielle (gtfs-validator MobilityData)

Le validateur canonique est un JAR Java (Java 17+).

```
# télécharger le JAR depuis github.com/MobilityData/gtfs-validator/releases
java -jar gtfs-validator.jar -i scripts/scrapers/buses/out/gtfs/crete.zip -o out/gtfs/validation
```

Objectif : **zéro `ERROR`** dans `out/gtfs/validation/report.json`. Les `WARNING`/
`INFO`/`NOTICE` (ex : absence de `shapes.txt`, `feed_lang` vs noms locaux) sont
listés et justifiés, pas masqués.

Voie de secours sans Java : validateur web `gtfs-validator.mobilitydata.org`
(upload de `crete.zip`).

## Honnêteté (règle no-invention)

Les horaires aux arrêts intermédiaires sont **estimés** (profil de temps
proportionnel à la distance routière OSRM) et portent `timepoint=0`. Seul le
départ du terminus (publié par KTEL) porte `timepoint=1` ; l'arrivée porte
`timepoint=1` uniquement si la durée totale est réelle (sinon `0`).

## Publication (étape D, owner Kami)

`scp out/gtfs/crete.zip` -> `media.crete.direct/gtfs/crete.zip` (Caddy) ;
inscription Mobility Database + transit.land ; Google = levier lobbying Région/KTEL.
