# Réseau bus — Plan 1.5 : curation & géocodage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendre la nomenclature `PREF-NN` propre en nettoyant les données KTEL brutes : filtrer le bruit (arrêts hôtels/supermarchés/codes), canoniser les doublons orthographiques, et géocoder davantage d'arrêts — pour passer de ~207 lignes (dont ~120 bruit) à un réseau d'une cinquantaine de vraies liaisons.

**Architecture (validée avec Kami) :**
- **Filtrage hybride** : une allowlist de lieux validés (coords sûres, slug canonique) + admission des autres lieux SAUF bruit évident (exclu par patterns) ; les admis sont géocodés via Nominatim et marqués `needs_review`.
- **Source unique partagée** : `BUS_PLACE_SLUGS` (aujourd'hui inline dans `src/lib/bus-pairs.ts`) est extrait dans `src/data/bus-places.json`, lu par le front (bus-pairs.ts) ET le pipeline Python — zéro drift.
- Le pipeline `build_network` (Plan 1) gagne une étape `curate_routes` en amont : canonise les noms en slugs, retire les arrêts bruit, dédoublonne. Le géocodage est ré-indexé par slug (PLACE_COORDS + cb_places par nom + Nominatim caché).

**Tech Stack:** Python 3 (venv `scripts/scrapers/buses/.venv`), pytest, requests (Nominatim, lazy), Next.js/TypeScript (JSON import), Postgres/PostgREST.

**Contexte (démo sur données réelles, 14/06) :** 383 routes → 207 lignes, 86/218 arrêts géocodés. Bruit constaté : arrêts hôtels (`Hotel Serita`, `Zorbas Village`), supermarchés (`A1 Super Market`), codes (`A10 Ag.Pelagia Beach`), doublons (`Anogia`/`Anogeia` — DISTINCTS volontairement ; `Rethymno`/`Rerhymno`, `Chromonastiri`/`Chromonastiti`, `Siteia`/`Sitia` — vrais doublons). OSRM réel validé (124 km routiers / 4008 points).

**Prérequis :** branche `feat/bus-network` (Plan 1 fondation, 70 tests verts). Ce plan continue dessus.

**Spec de référence :** `docs/superpowers/specs/2026-06-14-bus-network-nomenclature-design.md`

---

## File Structure

| Fichier | Responsabilité |
|---|---|
| `src/data/bus-places.json` | **Nouveau** — référentiel partagé `{nomDB: slug}` (source unique) |
| `src/lib/bus-pairs.ts` | **Modifié** — importe le JSON au lieu de la const inline |
| `scripts/scrapers/buses/net_places.py` | **Nouveau** — classification hybride : allowlist / admitted / noise, alias typos, display name |
| `scripts/scrapers/buses/net_geocode.py` | **Modifié** — géocodage indexé par slug (PLACE_COORDS réindexé + cb_places par nom + Nominatim) |
| `scripts/scrapers/buses/build_network.py` | **Modifié** — `curate_routes` en amont + flag `needs_review` |
| `supabase/migrations/20260614130000_bus_stops_needs_review.sql` | **Nouveau** — colonne `bus_stops.needs_review` |
| `scripts/scrapers/buses/test_net_*.py` | tests pytest |

**Conventions :** imports plats Python (CWD `scripts/scrapers/buses`), tests `.venv/Scripts/python -m pytest`. Git author `kerjeanfrancois29`, stage explicite, pas de push.

---

## Task 1: Extraire bus-places.json (source unique) + refactor bus-pairs.ts

**Files:**
- Create: `src/data/bus-places.json`
- Modify: `src/lib/bus-pairs.ts:14-89` (remplacer la const inline par l'import JSON)
- Verify: `scripts/check-bus-pairs.mjs` (test existant, ne pas casser)

- [ ] **Step 1: Générer le JSON depuis la const actuelle**

Créer `src/data/bus-places.json` avec EXACTEMENT le contenu actuel de `BUS_PLACE_SLUGS` (objet `{nomDB: slug}`). Copier les 75 paires depuis `src/lib/bus-pairs.ts:14-89` :

```json
{
  "Heraklion": "heraklion",
  "Agios Nikolaos": "agios-nikolaos",
  "Ierapetra": "ierapetra",
  "Siteia": "sitia",
  "Malia": "malia",
  "Hersonisos": "hersonissos",
  "Matala": "matala",
  "Moires": "moires",
  "Anogeia": "anogeia",
  "Ano Viannos": "ano-viannos",
  "Kokkini Hani": "kokkini-hani",
  "Eloynta": "elounda",
  "Kritsa": "kritsa",
  "Makry Gyalos": "makry-gyalos",
  "Myrtos": "myrtos",
  "Mochos": "mochos",
  "Stalida": "stalida",
  "Sisi": "sisi",
  "Gouves": "gouves",
  "Tympaki": "tympaki",
  "Agia Galini": "agia-galini",
  "Faistos": "phaistos",
  "Arkalochori": "arkalochori",
  "Kastelli Pediados": "kastelli-pediados",
  "Ano Archanes": "archanes",
  "Thrapsano": "thrapsano",
  "Myrtia": "myrtia",
  "Zakros": "zakros",
  "Palaiokastro Sitia": "palekastro",
  "Ziros": "ziros",
  "Mochlos": "mochlos",
  "Kalo Chorio Lasithioy": "kalo-chorio",
  "Ferma": "ferma",
  "Mesochorio": "mesochorio",
  "Demati": "demati",
  "Kroysonas": "krousonas",
  "Kamares": "kamares",
  "Cretaquarium": "cretaquarium",
  "Cretaquarium (Gournes)": "cretaquarium",
  "Plaka(Ag.Nikolaos)": "plaka",
  "Kroystas": "kroustas",
  "Aygeniki": "avgeniki",
  "Chania": "chania",
  "Rethymno": "rethymno",
  "Chania Airport": "chania-airport",
  "Kissamos": "kissamos",
  "Kasteli": "kissamos",
  "Elafonissi": "elafonissi",
  "Elafonisi": "elafonissi",
  "Paleochora": "paleochora",
  "Sougia": "sougia",
  "Chora Sfakion": "chora-sfakion",
  "Georgioupolis": "georgioupolis",
  "Kavros": "kavros",
  "Bali": "bali",
  "Plakias": "plakias",
  "Almirida": "almyrida",
  "Kalives": "kalyves",
  "Stavros": "stavros",
  "Panormo": "panormo",
  "Margarites": "margarites",
  "Theriso": "theriso",
  "Meskla": "meskla",
  "Vamos": "vamos",
  "Spili": "spili",
  "Perama": "perama",
  "Anogia": "anogeia-west",
  "Voukolies": "voukolies",
  "Sternes": "sternes",
  "Maleme": "maleme",
  "Arkadi": "arkadi",
  "Ano Meros": "ano-meros"
}
```

- [ ] **Step 2: Valider le JSON et l'équivalence avec la const**

Run: `cd /c/Users/fkerj/cretepulse-bus-network && node -e "const j=require('./src/data/bus-places.json'); console.log(Object.keys(j).length, 'entries', j['Anogia'], j['Anogeia'])"`
Expected: `75 entries anogeia-west anogeia`

- [ ] **Step 3: Refactor bus-pairs.ts pour importer le JSON**

Dans `src/lib/bus-pairs.ts`, remplacer le bloc `export const BUS_PLACE_SLUGS: Record<string, string> = { ... };` (lignes 14-89) par :

```typescript
import busPlaceSlugs from "@/data/bus-places.json";

// Lieu DB (orthographe exacte bus_routes) -> slug URL. Source unique partagée
// avec le pipeline réseau (scripts/scrapers/buses/net_places.py). Un lieu absent
// = jamais de page (arrets hotels, supermarches, bruit).
export const BUS_PLACE_SLUGS: Record<string, string> = busPlaceSlugs;
```

Laisser le reste du fichier (slugifyPlace, pairSlug, etc.) inchangé.

- [ ] **Step 4: Vérifier que tsc passe et le test bus-pairs ne régresse pas**

Run: `cd /c/Users/fkerj/cretepulse-bus-network && npx tsc --noEmit 2>&1 | head -20`
Expected: pas d'erreur sur bus-pairs.ts / bus-places.json (resolveJsonModule est déjà actif dans ce projet Next.js ; si tsc signale `Cannot find module './src/data/bus-places.json'`, vérifier `resolveJsonModule: true` dans tsconfig.json — il l'est par défaut en Next 16).

Run: `cd /c/Users/fkerj/cretepulse-bus-network && node scripts/check-bus-pairs.mjs 2>&1 | tail -5`
Expected: même sortie qu'avant (le test passe). **Si `check-bus-pairs.mjs` importe `bus-pairs.ts` via node type-stripping et casse sur l'import JSON**, ajouter `with { type: "json" }` à l'import dans bus-pairs.ts (`import busPlaceSlugs from "@/data/bus-places.json" with { type: "json" };`) puis re-tester. Documenter laquelle des deux formes passe.

- [ ] **Step 5: Commit**

```bash
git add src/data/bus-places.json src/lib/bus-pairs.ts
git commit -m "refactor(buses): bus-places.json source unique partagée TS+Python"
```

---

## Task 2: net_places.py — classification hybride (allowlist / admitted / noise)

**Files:**
- Create: `scripts/scrapers/buses/net_places.py`
- Test: `scripts/scrapers/buses/test_net_places.py`

- [ ] **Step 1: Écrire les tests** (`test_net_places.py`)

```python
from net_places import status_of, canonical_slug, display_name, load_allowlist

def test_allowlist_loaded_from_shared_json():
    al = load_allowlist()
    assert al["Heraklion"] == "heraklion"
    assert al["Anogia"] == "anogeia-west" and al["Anogeia"] == "anogeia"  # distincts

def test_status_allowlist():
    assert status_of("Heraklion") == "allowlist"
    assert status_of("Agios Nikolaos") == "allowlist"

def test_status_noise_hotels_supermarkets_codes():
    assert status_of("Hotel Serita (Anissaras Hotels)") == "noise"
    assert status_of("Zorbas Village (Analipsis Hotels)") == "noise"
    assert status_of("A1 Super Market") == "noise"
    assert status_of("A10 Ag.Pelagia Beach") == "noise"
    assert status_of("Malia Palace ,On The National R") == "noise"

def test_status_admitted_real_village():
    # vrai village hors allowlist, pas du bruit -> admis (à géocoder + valider)
    assert status_of("Garazo") == "admitted"
    assert status_of("Dafnes") == "admitted"

def test_canonical_slug_allowlist_and_aliases():
    assert canonical_slug("Heraklion") == "heraklion"
    assert canonical_slug("Elafonisi") == "elafonissi"      # alias allowlist
    assert canonical_slug("Kasteli") == "kissamos"          # alias allowlist

def test_canonical_slug_typo_fix():
    # typos de scraping corrigées vers l'orthographe DB canonique
    assert canonical_slug("Rerhymno") == "rethymno"
    assert canonical_slug("Chromonastiti") == canonical_slug("Chromonastiri")

def test_canonical_slug_noise_is_none():
    assert canonical_slug("A1 Super Market") is None
    assert canonical_slug("Hotel Serita (Anissaras Hotels)") is None

def test_canonical_slug_admitted_slugified():
    assert canonical_slug("Garazo") == "garazo"

def test_display_name_prefers_clean():
    assert display_name("Heraklion") == "Heraklion"
    assert display_name("Plaka(Ag.Nikolaos)") == "Plaka"     # slug plaka -> title
    assert display_name("Garazo") == "Garazo"
```

- [ ] **Step 2: Lancer les tests, vérifier l'échec** (`ModuleNotFoundError: No module named 'net_places'`)

Run: `cd scripts/scrapers/buses && .venv/Scripts/python -m pytest test_net_places.py -q`

- [ ] **Step 3: Implémenter `net_places.py`**

```python
"""Curation des arrêts (filtrage hybride). Source unique du référentiel des lieux
dignes = src/data/bus-places.json (partagé avec le front bus-pairs.ts).

Trois statuts :
- allowlist : lieu présent dans bus-places.json -> slug canonique sûr.
- noise     : arrêt hôtel/supermarché/code -> exclu du réseau.
- admitted  : autre lieu (vrai village probable) -> admis, à géocoder + valider.
"""
import json
import os
import re
from prices import _norm
from net_geocode import stop_slug

_HERE = os.path.dirname(os.path.abspath(__file__))
# bus-places.json vit dans le repo Next.js : remonter de scripts/scrapers/buses/
_JSON = os.path.normpath(os.path.join(_HERE, "..", "..", "..", "src", "data", "bus-places.json"))

# Typos de scraping constatées (14/06) -> orthographe DB canonique.
ALIAS_FIX = {
    "rerhymno": "Rethymno",
    "chromonastiti": "Chromonastiri",
    "manopiopoulo": "Manoliopoulo",
    "hrakleio old road": "Heraklion",
    "hrakleio": "Heraklion",
}

# Patterns de bruit : arrêts qui ne sont pas des localités desservies.
_NOISE = [
    re.compile(r"\bhotels?\b", re.I),
    re.compile(r"hotels?\)", re.I),
    re.compile(r"super\s*market", re.I),
    re.compile(r"\bsupermarket\b", re.I),
    re.compile(r"^a\d+\b", re.I),                 # codes 'A1', 'A10 ...'
    re.compile(r"\bvillage\b", re.I),             # 'Zorbas Village', 'Stella Village'
    re.compile(r"\bon the national\b", re.I),
    re.compile(r"\(.*hotels?\)", re.I),
]

_allowlist_cache = None


def load_allowlist():
    global _allowlist_cache
    if _allowlist_cache is None:
        with open(_JSON, encoding="utf-8") as f:
            _allowlist_cache = json.load(f)
    return _allowlist_cache


def _fixed(name):
    return ALIAS_FIX.get(_norm(name), name)


def status_of(name):
    fixed = _fixed(name)
    if fixed in load_allowlist():
        return "allowlist"
    if any(p.search(name) for p in _NOISE):
        return "noise"
    return "admitted"


def canonical_slug(name):
    """slug canonique, ou None si bruit."""
    fixed = _fixed(name)
    al = load_allowlist()
    if fixed in al:
        return al[fixed]
    if any(p.search(name) for p in _NOISE):
        return None
    return stop_slug(fixed)


def display_name(name):
    """Nom d'affichage propre dérivé du slug canonique (title-case)."""
    slug = canonical_slug(name)
    if slug is None:
        return name
    return slug.replace("-", " ").title()
```

- [ ] **Step 4: Lancer les tests, vérifier 9 PASS**

Run: `cd scripts/scrapers/buses && .venv/Scripts/python -m pytest test_net_places.py -q`

> Si un test de `noise`/`admitted` échoue sur un libellé réel inattendu, ajuster `_NOISE`/`ALIAS_FIX` (données réelles), pas le test d'intention. Ne JAMAIS marquer `noise` un vrai village.

- [ ] **Step 5: Commit**

```bash
git add scripts/scrapers/buses/net_places.py scripts/scrapers/buses/test_net_places.py
git commit -m "feat(buses): curation hybride des arrêts (allowlist/admitted/noise)"
```

---

## Task 3: Géocodage indexé par slug (PLACE_COORDS + cb_places par nom + Nominatim)

**Files:**
- Modify: `scripts/scrapers/buses/net_geocode.py` (ajouter les helpers slug ; ne pas casser l'existant)
- Test: `scripts/scrapers/buses/test_net_geocode.py` (ajouter des tests)

- [ ] **Step 1: Ajouter les tests** (append à `test_net_geocode.py`)

```python
from net_geocode import coords_index_by_slug, geocode_slug

def test_coords_index_reindexes_place_coords_by_slug():
    place_coords = {"agios nikolaos": (35.19, 25.71), "heraklion": (35.34, 25.14)}
    idx = coords_index_by_slug(place_coords, cb_by_name={})
    assert idx["agios-nikolaos"] == (35.19, 25.71)
    assert idx["heraklion"] == (35.34, 25.14)

def test_coords_index_adds_cb_places_by_name():
    place_coords = {}
    cb_by_name = {"garazo": (35.28, 24.86)}   # cb_places name normalisé -> coords
    idx = coords_index_by_slug(place_coords, cb_by_name, names_by_slug={"garazo": "Garazo"})
    assert idx["garazo"] == (35.28, 24.86)

def test_geocode_slug_index_first():
    idx = {"heraklion": (35.34, 25.14)}
    lat, lng, source, conf = geocode_slug("heraklion", "Heraklion", idx, nominatim=None)
    assert (round(lat, 2), round(lng, 2)) == (35.34, 25.14)
    assert source == "referentiel" and conf == "high"

def test_geocode_slug_nominatim_fallback():
    lat, lng, source, conf = geocode_slug(
        "garazo", "Garazo", {}, nominatim=lambda n: (35.28, 24.86))
    assert (lat, lng) == (35.28, 24.86)
    assert source == "geocoded" and conf == "low"

def test_geocode_slug_none_when_unresolvable():
    lat, lng, source, conf = geocode_slug("nowhere", "Nowhere", {}, nominatim=lambda n: None)
    assert lat is None and source == "none"
```

- [ ] **Step 2: Lancer, vérifier l'échec** (`ImportError: cannot import name 'coords_index_by_slug'`)

Run: `cd scripts/scrapers/buses && .venv/Scripts/python -m pytest test_net_geocode.py -q`

- [ ] **Step 3: Ajouter à `net_geocode.py`** (à la fin du fichier, sans modifier l'existant)

```python


def coords_index_by_slug(place_coords, cb_by_name, names_by_slug=None):
    """Construit {slug: (lat,lng)} en fusionnant :
    - PLACE_COORDS réindexé par stop_slug(nom) (référentiel main, prioritaire) ;
    - cb_places (dict {nom_normalisé: (lat,lng)}) matché au nom d'affichage du slug.
    `names_by_slug` : {slug: display_name} pour résoudre le nom à matcher dans cb_by_name.
    """
    idx = {}
    for name, coords in place_coords.items():
        idx[stop_slug(name)] = coords
    if cb_by_name and names_by_slug:
        for slug, disp in names_by_slug.items():
            if slug in idx:
                continue
            hit = cb_by_name.get(_norm(disp))
            if hit:
                idx[slug] = hit
    return idx


def geocode_slug(slug, display, coords_index, nominatim=None):
    """Géocode un slug : index (référentiel/cb_places) puis Nominatim.
    Retourne (lat, lng, source, confidence)."""
    if slug in coords_index:
        lat, lng = coords_index[slug]
        return lat, lng, "referentiel", "high"
    if nominatim is not None:
        hit = nominatim(display)
        if hit:
            return hit[0], hit[1], "geocoded", "low"
    return None, None, "none", "low"
```

- [ ] **Step 4: Lancer, vérifier que tous les tests passent** (5 nouveaux + 6 existants)

Run: `cd scripts/scrapers/buses && .venv/Scripts/python -m pytest test_net_geocode.py -q`
Expected: 11 passed

- [ ] **Step 5: Commit**

```bash
git add scripts/scrapers/buses/net_geocode.py scripts/scrapers/buses/test_net_geocode.py
git commit -m "feat(buses): géocodage indexé par slug (référentiel + cb_places + Nominatim)"
```

---

## Task 4: Intégrer la curation dans build_network + migration needs_review

**Files:**
- Create: `supabase/migrations/20260614130000_bus_stops_needs_review.sql`
- Modify: `scripts/scrapers/buses/build_network.py`
- Modify: `scripts/scrapers/buses/test_build_network.py`

- [ ] **Step 1: Migration colonne needs_review**

Create `supabase/migrations/20260614130000_bus_stops_needs_review.sql`:

```sql
-- Arrêts "admitted" (hors allowlist, géocodés au mieux) à valider manuellement.
alter table bus_stops add column if not exists needs_review boolean not null default false;
notify pgrst, 'reload schema';
```

Valider le parse : `cd /c/Users/fkerj/cretepulse-bus-network && scripts/scrapers/buses/.venv/Scripts/python -c "import pathlib; s=pathlib.Path('supabase/migrations/20260614130000_bus_stops_needs_review.sql').read_text(encoding='utf-8'); assert 'needs_review' in s; print('OK')"`

- [ ] **Step 2: Ajouter les tests** (append à `test_build_network.py`)

```python
from build_network import curate_routes

def test_curate_drops_noise_terminus():
    routes = [
        {"id": 1, "operator_id": "herlas", "from_place": "Heraklion",
         "to_place": "Hotel Serita (Anissaras Hotels)", "via_stops": None, "duration": "10min"},
    ]
    out = curate_routes(routes)
    assert out == []   # destination = bruit -> route entière jetée

def test_curate_strips_noise_via_keeps_route():
    routes = [
        {"id": 2, "operator_id": "herlas", "from_place": "Heraklion", "to_place": "Malia",
         "via_stops": ["A1 Super Market", "Gouves"], "duration": "45min"},
    ]
    out = curate_routes(routes)
    assert len(out) == 1
    # via bruit retiré, via digne canonisé en slug ; from/to canonisés
    assert out[0]["from_place"] == "heraklion"
    assert out[0]["to_place"] == "malia"
    assert out[0]["via_stops"] == ["gouves"]

def test_curate_canonises_aliases_and_typos():
    routes = [
        {"id": 3, "operator_id": "ektel", "from_place": "Rerhymno", "to_place": "Elafonisi",
         "via_stops": None, "duration": "1h"},
    ]
    out = curate_routes(routes)
    assert out[0]["from_place"] == "rethymno"     # typo corrigée
    assert out[0]["to_place"] == "elafonissi"     # alias allowlist
```

- [ ] **Step 3: Lancer, vérifier l'échec** (`ImportError: cannot import name 'curate_routes'`)

Run: `cd scripts/scrapers/buses && .venv/Scripts/python -m pytest test_build_network.py -q`

- [ ] **Step 4: Implémenter dans `build_network.py`**

(a) Ajouter l'import en tête (après les autres imports `net_*`) :
```python
from net_places import canonical_slug, status_of, display_name
```

(b) Ajouter la fonction `curate_routes` (avant `assemble_network`) :
```python
def curate_routes(routes):
    """Canonise from/to/via en slugs (filtrage hybride). Jette une route dont un
    terminus est du bruit ; retire les via bruit ; dédoublonne via les slugs."""
    out = []
    for r in routes:
        a, b = canonical_slug(r["from_place"]), canonical_slug(r["to_place"])
        if a is None or b is None:
            continue  # terminus bruit -> route entière écartée
        via = []
        for v in (r.get("via_stops") or []):
            cs = canonical_slug(v)
            if cs is not None and cs not in (a, b) and cs not in via:
                via.append(cs)
        out.append({**r, "from_place": a, "to_place": b, "via_stops": via or None})
    return out
```

(c) Dans `assemble_network`, marquer `needs_review` selon le statut. Remplacer la construction du `rec` de stop par :
```python
        lat, lng, source, conf = geocode_stop(s["name"], place_coords, cb_index, nominatim=nominatim)
        rec = {"slug": s["slug"], "name": display_name(s["name"]), "name_el": None,
               "lat": lat, "lng": lng, "prefecture": prefecture_for(lat, lng),
               "coords_source": source, "coords_confidence": conf,
               "needs_review": status_of(s["name"]) == "admitted"}
```
> Note : ici `s["name"]` est déjà un slug canonique (curate_routes tourne avant), donc `status_of`/`display_name` sont idempotents sur un slug. `display_name` d'un slug = title-case propre.

(d) Dans `build_network` (l'entrée), insérer la curation juste après la lecture des routes :
```python
    routes = sb.table("bus_routes").select(
        "id,operator_id,from_place,to_place,via_stops,duration").execute().data
    routes = curate_routes(routes)
    cb_index = _load_cb_index(sb)
```

(e) `store_network` : ajouter `needs_review` au payload `bus_stops` insert. Le dict `stops` le porte déjà (point c) ; vérifier que l'insert envoie le dict complet (il le fait — `sb.table("bus_stops").insert(stops)`).

- [ ] **Step 5: Lancer les tests build_network + suite complète**

Run: `cd scripts/scrapers/buses && .venv/Scripts/python -m pytest test_build_network.py -q` (expect 6 passed : 3 anciens + 3 curate)
Run: `cd scripts/scrapers/buses && .venv/Scripts/python -m pytest -q` (expect tout vert)

> Les 3 tests existants de `test_build_network.py` passent des noms déjà propres ("Heraklion", "Sitia", "Agios Nikolaos") qui sont dans l'allowlist → `curate_routes` (si appelé) les canonise en slugs identiques aux attentes ; `assemble_network` est testé directement (sans curate) donc inchangé. Vérifier qu'aucun ancien test ne casse ; si un ancien test dépend de `via_stops` non canonisé, l'ajuster pour re=passer par des slugs.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260614130000_bus_stops_needs_review.sql scripts/scrapers/buses/build_network.py scripts/scrapers/buses/test_build_network.py
git commit -m "feat(buses): curation intégrée au pipeline + flag needs_review"
```

---

## Task 5: Vérification sur données réelles (re-mesure) + revue manuelle

> Opérationnel (pas de TDD) : confirmer l'effet de la curation sur les vraies données.

- [ ] **Step 1: Script de mesure jetable**

Écrire un script temporaire (non commité) `scripts/scrapers/buses/_measure.py` qui : charge les vraies `bus_routes` (PostgREST, env de `cretepulse-build/.env.local`), applique `curate_routes`, charge cb_places (`{_norm(name): (lat,lng)}`), construit `coords_index_by_slug`, lance `assemble_network` (fetch haversine `lambda u: None`), et imprime : nb routes avant/après curation, nb lignes, nb arrêts géocodés / total, et la liste des arrêts `needs_review` non géocodés (= à compléter dans PLACE_COORDS ou via Nominatim).

- [ ] **Step 2: Lancer et comparer aux baselines**

Cibles indicatives (vs démo 14/06 : 207 lignes, 86/218 géocodés) :
- lignes : **chute nette** (objectif < ~90, le bruit hôtels/codes/supermarchés écarté) ;
- géocodage : **hausse** du taux sur les arrêts retenus ;
- liste `needs_review` : courte et exploitable (vrais villages à valider).

Si le bruit persiste (faux négatifs `noise`) ou de vrais villages sont jetés (faux positifs `noise`), ajuster `_NOISE`/`ALIAS_FIX` dans `net_places.py` (+ test) et re-mesurer. **Toujours préférer admettre un douteux (needs_review) que jeter un vrai village.**

- [ ] **Step 3: Supprimer le script jetable**

```bash
rm scripts/scrapers/buses/_measure.py
```

- [ ] **Step 4: Synthèse à Kami**

Rapporter avant/après (lignes, géocodage), un échantillon de la nomenclature nettoyée, et la liste `needs_review`. Décider avec Kami : (a) compléter PLACE_COORDS pour les villages fréquents, (b) activer Nominatim au build VPS (Task 9 du Plan 1), (c) merge/déploiement.

---

## Self-Review (effectuée)

**Couverture des 3 axes de curation :**
- Filtre qualité hybride (allowlist + noise + admitted) → Tasks 2, 4. ✓
- Canonisation des doublons (alias allowlist + typos) → Task 2 (`ALIAS_FIX`, allowlist multi-orthographes). ✓
- Géocodage enrichi (réindex slug + cb_places par nom + Nominatim) → Task 3. ✓
- Source unique partagée TS+Python → Task 1 (`bus-places.json`). ✓
- Flag `needs_review` pour les admis → Task 4 (migration + assemble). ✓

**Placeholders :** aucun ; tout le code est fourni. Les seuls ajustements prévus (`_NOISE`/`ALIAS_FIX`) sont des calibrations sur données réelles, encadrées par la règle « jamais jeter un vrai village ».

**Cohérence des types :** `curate_routes` produit des routes dont from/to/via sont des slugs ; `assemble_network` (Plan 1) consomme déjà des slugs via `stop_slug` (idempotent) ; `status_of`/`display_name` idempotents sur slug ; `bus_stops.needs_review` (migration) ↔ clé `needs_review` (assemble) ↔ insert (store). ✓

**Risque résiduel :** la qualité des patterns `_NOISE` et la couverture Nominatim se valident sur données réelles (Task 5) ; réversible (calibration de listes, pas de refonte). Le refactor `bus-pairs.ts` (Task 1) est le seul changement front — couvert par `check-bus-pairs.mjs`.
