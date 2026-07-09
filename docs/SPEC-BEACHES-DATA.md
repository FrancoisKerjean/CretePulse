# Spec — Refonte plages data-croisée (feat/beaches-data)

Date : 09/07/2026. Base : audit 4 agents (code + base PostgREST VPS).
Objectif : transformer les pages plages en utilitaires data-croisés + hub /beaches vivant.
Positionnement : data-driven utilitaire, anti-AI-Overviews.

## État des lieux (vérifié)

- **182 plages** en table `beaches` (pas ~300), GPS 100 %, `region` 100 % (west 73 / central 72 / east 37).
- Trous : 45 sans photo, 30 sans description, 47 % sans `type`, `wind_exposure` et `length_m` vides à 100 %, `name_fr` 17/182.
- **Qualité d'eau EEA : DÉJÀ FAIT** (`src/lib/bathing-water.ts` + `src/data/bathing-water-crete-2025.json`, ~60 sites, match GPS <0,7 km). Badge hub + FAQ détail. `water_quality` n'existe PAS en base et n'a pas besoin d'y être.
- **Moteur conditions du jour : EXISTE** (`src/lib/swim-today.ts` : scoreBeach vent/orientation/vagues/abri cb_places, 10 villes météo, cache Supabase `weather_cache` + cron VPS horaire). Consommé par `/beaches/today` (ISR 30 min) mais PAS par la page détail (ISR 48 h).
- **Densité Airbnb : générée mais orpheline** (`public/data/airbnb-density.json`, GeoJSON ~1400 cellules 2,2 km, poids 42–2061). Aucun consommateur.
- **cb_places matché sur 180/182 plages** (`cb-beach-match.ts`, <1,5 km) avec `crowds` (None/Quiet/Normal/Crowded), `sea_surface`, `depth`, `facilities`.
- **Bus : 1550 `bus_stops` GPS 100 %** (citybus 1001, osm 489, agncitybus 32, ktel 28) + `bus_destinations` (GPS + `has_direct_bus`) + 89 destinations whitelistées `BUS_PLACE_SLUGS` pour les pages `/buses/[pair]`. `nearestStop()` existe déjà dans swim-today (rayon 12 km sur bus_destinations).

## Faisable vs manquant

| Croisement brief | Verdict | Comment |
|---|---|---|
| 1. Conditions du jour sur page détail | ✅ Faisable | Composant client + route API `/api/beach-conditions/[slug]` réutilisant scoreBeach + weather_cache (30 min). Pas de baisse du revalidate 48 h (coûts ISR Vercel préservés). |
| 2. Affluence estimée | ✅ Faisable | Score précalculé (script build) : densité Airbnb dans un rayon 3 km + `crowds` cb_places. Statique, pas live. |
| 3. Bus vers la plage | ✅ Faisable | Arrêt physique le plus proche via `bus_stops` (1550) + destination bus la plus proche via `bus_destinations` → lien `/buses/[pair]` si whitelistée. |
| 4. Qualité d'eau | ✅ Déjà en prod | Rien à coder côté data ; on garde le badge existant, intégré au nouveau bloc. |
| 5. Alternatives moins fréquentées | ✅ Faisable | Même `region`, score affluence inférieur, ≤25 km (extension de getNearbyBeaches). |
| Hub /beaches vivant | ✅ Faisable | Bloc client « conditions maintenant par zone » fetché sur une route API (réutilise buildSwimToday), hub reste ISR 24 h. |

Manquant / renoncements assumés :
- Pas de `prefecture` en base : on utilise `region` (équivalent fonctionnel).
- Météo par plage = ville la plus proche parmi 10 (précision suffisante, déjà le cas sur /today).
- Couverture EEA ~60 sites pour 182 plages : badge affiché seulement si match certain (déjà le comportement, rien d'inventé).
- Lien arrêt→ligne (line_id) non câblé en base : le lien /buses/[pair] passe par la destination whitelistée la plus proche, pas par l'arrêt physique.

## Lots

1. **Lot 1 — Bus + conditions du jour** (page détail) : bloc « Y aller en bus » (arrêt + destination + lien pair) + bloc live « Conditions maintenant » (vent, état mer, verdict calm/fair/exposed, temp eau).
2. **Lot 2 — Affluence + alternatives** : script `build-beach-crowd-scores.mjs` → JSON `src/data/beach-crowd-scores.json`, badge affluence + section « Alternatives plus calmes » (redistribution des flux).
3. **Lot 3 — Hub vivant** : classement du jour par zone sur /beaches (bloc client), tri/badges affluence.

Traductions : 4 locales pleines (EN/FR/DE/EL) pour les nouveaux libellés, fallback EN pour les 18 autres (pattern existant BEACH_LABELS).

Règles : INDEXABLE_ROBOTS si clé robots redéfinie ; sanitizeImageUrl sur toute image ; jamais git add -A ; tsc + next build verts avant push ; preview Vercel avant prod.
