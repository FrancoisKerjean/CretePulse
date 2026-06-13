# Spec instrumentation : `bus_search` (à intégrer dans le chantier /buses)

Statut : **à intégrer par le terminal qui refait /buses** (`feat/buses-board`).
Posé le 13/06/2026 par le chantier `feat/instrumentation-decisional` qui ne
touche PAS les fichiers /buses (anti-collision).

## Pourquoi (le signal le plus précieux du site)

`/buses` = ~40 % de l'audience humaine, mais on ne capte PAS quels trajets les
gens cherchent dans le JourneyPlanner. Or cette demande pilote directement :
- la priorité **contenu/SEO** (créer/enrichir les pages `/buses/<from>-to-<to>` les plus demandées),
- la priorité **affiliation** (où poser voiture/transfert si une ligne très demandée est mal desservie),
- les **trous de couverture** (trajet cherché sans résultat = ligne manquante en base).

## Quoi capter

Émettre **un seul event** quand l'utilisateur lance une recherche (clic
"Rechercher" / submit du planner, PAS à chaque frappe) :

```ts
// dans le handler de submit du JourneyPlanner (composant client)
type Plausible = (e: string, o?: { props?: Record<string, string | number> }) => void;
(window as unknown as { plausible?: Plausible }).plausible?.("bus_search", {
  props: {
    from: fromSlug || "",            // slug du lieu de départ
    to: toSlug || "",                // slug de la destination
    date: dateChoice || "today",     // "today" | "tomorrow" | ISO
    results: matchedDepartures.length, // nb de départs trouvés (0 = trou à remonter)
  },
});
```

Notes :
- `results: 0` est le signal d'or (demande non satisfaite). Ne pas filtrer.
- Le `pathname` est attaché automatiquement par Plausible, pas besoin.
- Debounce inutile si c'est sur le submit (action explicite). Si jamais c'est
  sur un onChange réactif, debounce ~1s comme `search_query`.

## Lecture (une fois en prod, hors bot SG)

```sql
-- Top trajets cherchés (7j)
SELECT
  arrayElement(meta.value, indexOf(meta.key,'from')) AS de,
  arrayElement(meta.value, indexOf(meta.key,'to'))   AS vers,
  count() AS recherches,
  sumIf(1, arrayElement(meta.value, indexOf(meta.key,'results'))='0') AS sans_resultat
FROM plausible_events_db.events_v2
WHERE site_id=1 AND name='bus_search' AND country_code!='SG'
  AND timestamp >= now()-INTERVAL 7 DAY
GROUP BY de, vers ORDER BY recherches DESC LIMIT 30;
```

→ à ajouter ensuite dans `attractiveness-weekly.sh` (section "demande bus").
