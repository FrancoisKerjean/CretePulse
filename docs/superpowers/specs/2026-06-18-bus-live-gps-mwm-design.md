# Bus Live — Positions GPS réelles (backend MWM) + autonomie — Design Spec

- **Date** : 2026-06-18
- **Statut** : design validé (brainstorming Kami), prêt pour writing-plans
- **Repo** : `cretepulse` (worktree `cretepulse-bus-gps`, branche `feat/bus-live-gps`, basée sur `feat/bus-live-map`)
- **Auteur** : Kami + Claude

## 1. Contexte & objectif

Finalité posée par Kami : **« avoir la position des bus en temps réel de façon autonome ».**

Un système « bus live » existe déjà (branche `feat/bus-live-map`, partiellement en prod) :

- **Carte `/live`** (MapLibre, refresh 2 s + animation 60 fps) qui affiche des bus en mouvement.
- **MAIS** les positions sont **estimées par horaire** : interpolation déterministe sur la
  géométrie OSM (`src/lib/bus-live/position.ts`, `busesAt()`). Le badge affiche « Estimé selon l'horaire ».
- Brique data déjà solide : scrape horaires KTEL (Herlas Est + Ektel Ouest, cron dimanche),
  réseau OSM (78 lignes / 489 arrêts, prod 14/06), appariement KTEL↔OSM (196 routes, prod 15/06),
  export GTFS (livré). **Aucune vraie position GPS nulle part** : aucun polling d'un backend live.

La phrase de Kami décode donc **deux écarts** à combler sur un système déjà construit :

1. **Réel vs estimé** : remplacer/augmenter le moteur estimatif par les **vraies positions GPS**
   issues du **backend MWM** (la plateforme qui édite l'app officielle KTEL Heraklion-Lasithi ;
   feature confirmée : positions véhicules live, refresh ~30 s).
2. **Autonomie** : supprimer les étapes manuelles récurrentes du pipeline actuel (curation alias
   `ktel_to_osm.json` ~1 h/mois, cron `run_apparier.py` jamais activé, merge carte live→prod
   jamais fait). « Autonome » = zéro intervention humaine récurrente en régime nominal.

**Critère directeur gravé** : on n'affiche jamais une position fausse sans le dire. Un bus en
vrai GPS et un bus estimé sont visuellement distincts. Aucune donnée GPS n'est inventée.

## 2. Décisions verrouillées (brainstorming 18/06)

| Sujet | Décision |
|---|---|
| Source temps réel | **GPS réel via backend MWM** (non documenté → reverse-engineering). Pas de GTFS-RT public en Crète. |
| Repli | **Estimatif conservé en repli** : GPS primaire, estimatif quand pas de signal. Rien ne disparaît. |
| Distinction | **Badge par bus** : « 🟢 En direct (GPS) » vs « ~ Estimé ». |
| Surface | **Carte web `/live` + brique data**, ensemble. La carte consomme la brique. |
| Scope géo v1 | **KTEL Heraklion-Lasithi (Est) seul** (zone Kami, live MWM confirmé). Chania-Rethymno (Ouest) = v2. |
| Gate du projet | **Phase 0 (spike MWM)** : si l'endpoint est inatteignable, on garde l'estimatif et on s'arrête. |
| Hébergement collecteur | **VPS kairos-vps** (où vivent déjà `buses.py`, `alerts.py`, le Postgres). Service continu. |

## 3. Phase 0 — Spike de faisabilité MWM (GATE de tout le reste)

**Objectif** : prouver, avec des faits, qu'on peut récupérer de façon autonome les positions GPS
des bus KTEL Heraklion-Lasithi via le backend MWM, et les rattacher à une ligne.

**Méthode** (par ordre de préférence, on s'arrête au premier qui marche) :
1. **Capture trafic app** : émulateur Android + proxy MITM (mitmproxy/Charles) sur l'app
   `gr.ktelherlas.app` → observer les requêtes XHR de la carte live (URL, méthode, headers, auth, payload).
2. **Décompilation APK** (si TLS pinning bloque la capture) : extraire l'APK, chercher l'URL de
   base MWM, les clés/tokens embarqués, le schéma des endpoints.
3. **Web app MWM** (si elle existe) : certains produits MWM ont un pendant web exposant les mêmes XHR.

**Livrables du spike (critères de succès, tous requis pour continuer)** :
- [ ] URL exacte de l'endpoint « vehicle positions » + méthode + headers nécessaires.
- [ ] Schéma de la réponse : champs `vehicle_id`, `lat`, `lng`, `bearing/heading`, identifiant de
      ligne/trajet, horodatage. Documenté avec un échantillon réel (anonymisé).
- [ ] Modèle d'authentification : token statique embarqué ? clé d'API ? session dynamique ?
      Faisabilité de l'auth depuis un service serveur sans l'app.
- [ ] Cadence réelle de mise à jour côté backend (~30 s annoncé, à confirmer).
- [ ] **Rattachement véhicule → ligne** : comment la réponse identifie la ligne. C'est le point
      qui conditionne l'utilité (un point GPS sans ligne = peu exploitable).
- [ ] Note CGU / robustesse : politesse de polling, risque de blocage, fragilité estimée.

**Sortie de décision** : GO (faisable, on construit le reste) / NO-GO (inatteignable → on garde
l'estimatif tel quel, on documente pourquoi, fin du projet). Aucun code de collecteur écrit avant GO.

## 4. Architecture (post-GO)

```
[Phase 0 SPIKE MWM] --GO-->
        │
        ▼
[Collecteur GPS]  service Python continu (VPS, systemd, boucle ~30 s)
   poll MWM → normalise → upsert Supabase
        ▼
[Table live]  bus_vehicles_live (Supabase, RLS lecture publique) + Supabase Realtime
        ▼
[Matching véhicule → ligne]  réutilise l'appariement existant (OSM line_id / passe GPS)
        ▼
[Carte /live]  GPS primaire, estimatif en repli ; badge par bus
        ▼
[Clôture autonomie]  crons activés + service supervisé + merge prod
```

Découplage par la table `bus_vehicles_live` (même pattern que `bus_alerts` pour le sous-système social) :
le collecteur (producteur) et le front (consommateur) ne se connaissent que via Supabase.

## 5. Composants

### 5.1 Collecteur GPS — `scripts/scrapers/buses/gps_collector.py` (NOUVEAU, Python)
- Boucle continue (`while True` + sleep ~30 s aligné sur la cadence MWM confirmée au spike).
- Appelle l'endpoint MWM, parse la réponse, normalise chaque véhicule en
  `{ vehicle_id, lat, lng, bearing, line_ref, captured_at }`.
- **Upsert** dans `bus_vehicles_live` (clé = `vehicle_id`). Écrase la position précédente.
- **Garde-fous** : timeout + retry borné ; si l'endpoint répond mal N fois → alerte Telegram
  (Bot.PLUME, même canal que les autres garde-fous cretepulse) et conserve la dernière donnée.
- **Service systemd** `cretepulse-gps.service` (Restart=always) sur le VPS — pas de cron
  (c'est un service continu, pas une tâche périodique). Healthcheck + supervision.
- Anti-hallucination : ne stocke QUE des champs présents dans la réponse réelle ; aucun champ déduit/inventé.

### 5.2 Modèle de données — `bus_vehicles_live` (NOUVELLE table)
Migration additive Supabase (`supabase/migrations/<ts>_bus_vehicles_live.sql`) :
- `vehicle_id text PRIMARY KEY` — identifiant véhicule MWM.
- `lat double precision`, `lng double precision`, `bearing real NULL`.
- `line_id bigint NULL` — FK vers `bus_lines(id)` après matching (NULL si non résolu).
- `line_ref text NULL` — identifiant ligne brut MWM (avant résolution, pour debug/matching).
- `captured_at timestamptz` — horodatage de la position (source ou ingestion).
- `updated_at timestamptz default now()`.
- **TTL applicatif** : une position non rafraîchie depuis > 2 min est considérée périmée
  (le véhicule est descendu / hors service) → le front ne l'affiche plus en GPS (repli estimatif).
- **RLS** : lecture publique (`select` anon) ; écriture réservée à la service key (le collecteur).

### 5.3 Matching véhicule → ligne
Réutilise l'appariement existant (`ktel_apparier.py`, `bus_routes.line_id`, passe GPS `match_gaps_by_gps`).
Deux cas selon ce que MWM fournit (déterminé au spike) :
- **MWM donne un identifiant de ligne exploitable** → table de correspondance `line_ref → bus_lines.id`
  (générée une fois, maintenue avec les alias existants). Cas simple.
- **MWM ne donne pas la ligne** (juste un point GPS) → rattachement géométrique : associer le
  véhicule à la `bus_line` dont la polyline OSM est la plus proche (réutilise `ktel_geo`). Cas dégradé,
  acceptable pour l'affichage. Décidé au spike.

### 5.4 Carte `/live` — évolution (front, `feat/bus-live-map`)
- `LiveMapClient.tsx` : ajoute une source de données **GPS** en plus de l'estimatif existant.
  - Récupération GPS : **Supabase Realtime** (subscription sur `bus_vehicles_live`) en primaire ;
    repli polling (~15 s) si Realtime indisponible.
  - **Fusion** : pour chaque ligne, un véhicule GPS frais (< 2 min) **remplace** le bus estimé
    correspondant ; sinon on garde l'estimé. Pas de doublon (clé de réconciliation = ligne + sens).
  - **Badge par bus** : marqueur GPS distinct (couleur/halo « live ») vs marqueur estimé.
  - Badge global : « N bus en direct · M estimés ».
- Le moteur estimatif (`src/lib/bus-live/position.ts`, `busesAt()`) **reste inchangé** : il devient
  la couche de repli. Aucune régression sur le comportement actuel sans GPS.

### 5.5 Clôture autonomie (l'écart #2)
- Activer le cron `run_apparier.py` (spec SP2 le prévoyait : 04:45 quotidien + 02:15 dimanche) —
  jamais activé à ce jour.
- Superviser `cretepulse-gps.service` (systemd Restart=always + alerte si down).
- Réduire la curation manuelle des alias `ktel_to_osm.json` : journaliser les non-matchs et
  proposer les ajouts automatiquement (revue humaine optionnelle, pas bloquante). YAGNI : ne PAS
  viser zéro humain sur la curation en v1 ; viser zéro humain sur le **flux de positions live**.
- Merge `feat/bus-live-gps` → prod (acte outward-facing, sur GO Kami) + bascule du badge `/live`.

## 6. Flux nominal (post-déploiement)

`cretepulse-gps.service` tourne en continu → toutes les ~30 s, positions MWM → `bus_vehicles_live`.
Un visiteur ouvre `/live` → Realtime pousse les positions → la carte affiche les bus GPS (live) et
complète avec les bus estimés là où il n'y a pas de signal. Zéro intervention humaine.

## 7. Idempotence & garde-fous

- **Idempotence collecteur** : upsert par `vehicle_id` ; relancer le service ne crée pas de doublon.
- **Fraîcheur** : TTL 2 min ; une position périmée bascule en repli estimatif (jamais affichée comme live).
- **Anti-hallucination** : seuls les champs réellement renvoyés par MWM sont stockés/affichés en GPS.
- **Dégradation propre** : MWM down → le front reste fonctionnel en 100 % estimatif (état actuel).
- **Politesse réseau** : cadence alignée sur MWM (~30 s), UA identifiable, backoff sur erreur.
- **Fragilité assumée** : endpoint non documenté → healthcheck + alerte Telegram + ré-vérification
  périodique (le NO-GO reste possible même après GO si MWM ferme l'accès).

## 8. Tests

Pattern existant (`scripts/check-*.mjs` côté Node, tests Python côté collecteur) :
- **Spike** (Phase 0) : documenté dans un rapport `docs/.../bus-gps-spike-report.md` avec échantillon réel.
- **Normalisation** (`gps_collector`) : fixture d'une réponse MWM réelle sauvegardée → assertions
  sur le mapping `{vehicle_id, lat, lng, bearing, line_ref, captured_at}` (pas de champ inventé,
  coordonnées dans la bounding box Crète).
- **TTL / fraîcheur** : une position vieille de > 2 min est exclue de l'affichage GPS.
- **Matching véhicule → ligne** : fixtures véhicules → `line_id` attendu (cas direct + cas géométrique).
- **Fusion front** : test de réconciliation (un GPS frais masque l'estimé de la même ligne ;
  pas de doublon ; repli estimatif quand GPS absent/périmé).
- **Non-régression estimatif** : la carte sans GPS se comporte exactement comme aujourd'hui.

## 9. Hors-scope (YAGNI v1)

- **KTEL Ouest (Chania-Rethymno / Ektel)** : 2e backend à reverser, peut ne pas être sur MWM → v2.
- **Historique des positions / trajectoires (trails)** : `bus_vehicles_live` est un instantané. Pas
  de table d'historique en v1 (ajout possible plus tard pour analytics/retards).
- **ETA recalculé sur le GPS réel** (retards en temps réel aux arrêts) : v2. v1 affiche la position,
  l'ETA reste estimatif.
- **App mobile crete.direct** : consommera la même brique data plus tard (Gate B roadmap), hors v1.
- **Zéro humain sur la curation des alias** : v1 réduit, ne supprime pas.

## 10. Risques connus

- **Accès MWM (risque #1, existentiel)** : non documenté, TLS pinning possible, auth potentiellement
  dynamique, peut fermer sans préavis. → Mitigation : Phase 0 gate + repli estimatif permanent.
- **Rattachement ligne faible** : si MWM ne donne pas la ligne et que le matching géométrique est
  ambigu (lignes parallèles), un bus peut être affiché sur la mauvaise ligne. → Mitigation : seuil
  de distance + fallback « ligne inconnue » plutôt que faux positif.
- **Couverture GPS partielle** : MWM peut ne tracer que quelques véhicules → carte majoritairement
  estimée. C'est acceptable (décision : repli conservé) mais à mesurer au spike pour caler les attentes.
- **CGU / blocage** : usage du backend privé d'un tiers. → Politesse, UA honnête, acceptation que
  ça puisse devoir s'arrêter ; aucune dépendance critique d'autre système sur ce flux.
