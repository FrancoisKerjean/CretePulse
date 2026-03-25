#!/usr/bin/env python3
"""
Fix missing French accents in Supabase news table (title_fr, summary_fr).
Fetches all articles where rewritten=True and applies a comprehensive accent dictionary.
"""
import re
import os
import sys

SUPABASE_URL = "https://fzofxinjsuexjoxlwrhg.supabase.co"
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")

# Try to get service key from env files
if not SUPABASE_KEY:
    for env_file in [
        "/c/Users/fkerj/cretepulse-build/.env.local",
        "/c/Users/fkerj/cretepulse-build/.env",
        "C:/Users/fkerj/cretepulse-build/.env.local",
    ]:
        try:
            with open(env_file) as f:
                for line in f:
                    line = line.strip()
                    if line.startswith("SUPABASE_SERVICE_KEY="):
                        SUPABASE_KEY = line.split("=", 1)[1].strip()
                    elif line.startswith("NEXT_PUBLIC_SUPABASE_ANON_KEY=") and not SUPABASE_KEY:
                        SUPABASE_KEY = line.split("=", 1)[1].strip()
        except FileNotFoundError:
            pass
        if SUPABASE_KEY:
            break

if not SUPABASE_KEY:
    print("ERROR: No Supabase key found")
    sys.exit(1)

print(f"Using key: {SUPABASE_KEY[:20]}...")

try:
    from supabase import create_client
    sb = create_client(SUPABASE_URL, SUPABASE_KEY)
except ImportError:
    print("Installing supabase...")
    import subprocess
    subprocess.run([sys.executable, "-m", "pip", "install", "supabase"], check=True)
    from supabase import create_client
    sb = create_client(SUPABASE_URL, SUPABASE_KEY)

# ─────────────────────────────────────────────────────────────
# Comprehensive French accent dictionary
# Format: (pattern, replacement) — applied with word boundaries
# Order matters: longer/more specific patterns first
# ─────────────────────────────────────────────────────────────

# Word-level replacements (case-insensitive with case preservation)
WORD_REPLACEMENTS = {
    # A
    "aeroport": "aéroport",
    "aeroports": "aéroports",
    "agee": "âgée",
    "ages": "âgés",
    "age": "âgé",
    "agrement": "agrément",
    "amelioration": "amélioration",
    "ameliorations": "améliorations",
    "ameliore": "amélioré",
    "ameliorer": "améliorer",
    "amenagement": "aménagement",
    "amenagements": "aménagements",
    "annee": "année",
    "annees": "années",
    "anterieures": "antérieures",
    "anterieure": "antérieure",
    "anterieur": "antérieur",
    "apres": "après",
    "arretee": "arrêtée",
    "arrete": "arrêté",
    "arretes": "arrêtés",
    "assemblee": "assemblée",
    "associe": "associé",
    "associes": "associés",
    "autorite": "autorité",
    "autorites": "autorités",
    "avere": "avéré",

    # B
    "batiment": "bâtiment",
    "batiments": "bâtiments",
    "benerice": "bénéfice",
    "benefice": "bénéfice",
    "benefices": "bénéfices",
    "beneficiaire": "bénéficiaire",
    "beneficiaires": "bénéficiaires",
    "beneficier": "bénéficier",

    # C
    "Canee": "Canée",
    "canee": "canée",
    "capacite": "capacité",
    "capacites": "capacités",
    "celebre": "célèbre",
    "celebres": "célèbres",
    "celebree": "célébrée",
    "celebration": "célébration",
    "celebrer": "célébrer",
    "celebrite": "célébrité",
    "cle": "clé",
    "cles": "clés",
    "collectivite": "collectivité",
    "collectivites": "collectivités",
    "communaute": "communauté",
    "communautes": "communautés",
    "completee": "complétée",
    "complete": "complète",
    "completement": "complètement",
    "complexite": "complexité",
    "concede": "concédé",
    "concerne": "concerné",
    "concernes": "concernés",
    "conferee": "conférée",
    "conference": "conférence",
    "conferences": "conférences",
    "congres": "congrès",
    "continuite": "continuité",
    "creee": "créée",
    "creees": "créées",
    "cree": "créé",
    "crees": "créés",
    "creer": "créer",
    "Crete": "Crète",
    "crete": "crète",  # lowercase only when not at start
    "cretois": "crétois",
    "cretoise": "crétoise",
    "cretois": "crétois",

    # D
    "dedie": "dédié",
    "dedies": "dédiés",
    "dediee": "dédiée",
    "delegue": "délégué",
    "delegues": "délégués",
    "dependance": "dépendance",
    "depenses": "dépenses",
    "deplacement": "déplacement",
    "deplacements": "déplacements",
    "deploiement": "déploiement",
    "designe": "désigné",
    "designation": "désignation",
    "determinant": "déterminant",
    "determinants": "déterminants",
    "determinante": "déterminante",
    "developpement": "développement",
    "developpements": "développements",
    "developper": "développer",
    "devenu": "devenu",
    "difficulte": "difficulté",
    "difficultes": "difficultés",
    "disponibilite": "disponibilité",
    "disponibilites": "disponibilités",
    "diversite": "diversité",

    # E
    "echange": "échange",
    "echanges": "échanges",
    "echelle": "échelle",
    "echelles": "échelles",
    "echeance": "échéance",
    "economie": "économie",
    "economies": "économies",
    "economique": "économique",
    "economiques": "économiques",
    "efficacite": "efficacité",
    "egalite": "égalité",
    "egalement": "également",
    "election": "élection",
    "elections": "élections",
    "electrique": "électrique",
    "electricite": "électricité",
    "emergence": "émergence",
    "emploie": "emploie",
    "energie": "énergie",
    "energies": "énergies",
    "energetique": "énergétique",
    "ensemble": "ensemble",
    "entreprise": "entreprise",
    "entreprises": "entreprises",
    "equilibre": "équilibre",
    "equipement": "équipement",
    "equipements": "équipements",
    "etape": "étape",
    "etapes": "étapes",
    "etat": "état",
    "etats": "états",
    "ete": "été",
    "etude": "étude",
    "etudes": "études",
    "evenement": "événement",
    "evenements": "événements",
    "evolution": "évolution",
    "evolutions": "évolutions",

    # F
    "facilite": "facilité",
    "facilites": "facilités",
    "fete": "fête",
    "fetes": "fêtes",
    "fidelite": "fidélité",
    "finalite": "finalité",
    "fonctionnalite": "fonctionnalité",
    "fonctionnalites": "fonctionnalités",
    "formalite": "formalité",
    "formalites": "formalités",

    # G
    "generale": "générale",
    "generales": "générales",
    "general": "général",
    "generaux": "généraux",
    "generation": "génération",
    "generations": "générations",
    "geree": "gérée",
    "gerees": "gérées",
    "gere": "géré",
    "geres": "gérés",
    "gestion": "gestion",
    "gouvernement": "gouvernement",
    "grece": "Grèce",

    # H
    "heritage": "héritage",
    "hierarchie": "hiérarchie",
    "histoire": "histoire",

    # I
    "identite": "identité",
    "immediat": "immédiat",
    "immediate": "immédiate",
    "immediats": "immédiats",
    "importance": "importance",
    "important": "important",
    "inaugure": "inauguré",
    "inauguration": "inauguration",
    "independance": "indépendance",
    "integration": "intégration",
    "integre": "intégré",
    "integres": "intégrés",
    "integree": "intégrée",
    "interet": "intérêt",
    "interets": "intérêts",
    "investissements": "investissements",

    # L
    "legere": "légère",
    "leger": "léger",
    "liberte": "liberté",
    "localite": "localité",
    "localites": "localités",

    # M
    "majorite": "majorité",
    "majorites": "majorités",
    "medecin": "médecin",
    "medecins": "médecins",
    "mediatique": "médiatique",
    "mediatheque": "médiathèque",
    "memoire": "mémoire",
    "mention": "mention",
    "merite": "mérite",
    "meteо": "météo",
    "meteo": "météo",
    "metropole": "métropole",
    "modernisation": "modernisation",
    "modernite": "modernité",
    "mobilite": "mobilité",
    "municipalite": "municipalité",
    "municipalites": "municipalités",

    # N
    "necessite": "nécessité",
    "necessite": "nécessite",
    "negociation": "négociation",
    "negociations": "négociations",
    "nouvelle": "nouvelle",

    # O
    "objectif": "objectif",
    "opportunite": "opportunité",
    "opportunites": "opportunités",

    # P
    "partenariat": "partenariat",
    "patrimoine": "patrimoine",
    "periode": "période",
    "periodes": "périodes",
    "phenomene": "phénomène",
    "phenomenes": "phénomènes",
    "popularite": "popularité",
    "prefecture": "préfecture",
    "prefecture": "préfecture",
    "prefet": "préfet",
    "premiere": "première",
    "premieres": "premières",
    "premier": "premier",
    "prise": "prise",
    "priorite": "priorité",
    "priorites": "priorités",
    "probleme": "problème",
    "problemes": "problèmes",
    "procedure": "procédure",
    "procedures": "procédures",
    "programmee": "programmée",
    "programme": "programme",
    "project": "projet",
    "projet": "projet",
    "propriete": "propriété",
    "proprietes": "propriétés",
    "protection": "protection",
    "publiee": "publiée",
    "publie": "publié",
    "publies": "publiés",

    # Q
    "qualite": "qualité",
    "qualites": "qualités",

    # R
    "realise": "réalisé",
    "realises": "réalisés",
    "realisee": "réalisée",
    "realisation": "réalisation",
    "realisations": "réalisations",
    "recent": "récent",
    "recente": "récente",
    "recents": "récents",
    "recouvrement": "recouvrement",
    "reflexion": "réflexion",
    "region": "région",
    "regions": "régions",
    "regional": "régional",
    "regionale": "régionale",
    "regionaux": "régionaux",
    "reglementation": "réglementation",
    "reglementations": "réglementations",
    "renouveau": "renouveau",
    "renovation": "rénovation",
    "renovations": "rénovations",
    "renove": "rénové",
    "renovee": "rénovée",
    "renovees": "rénovées",
    "repondre": "répondre",
    "repond": "répond",
    "representant": "représentant",
    "representants": "représentants",
    "represente": "représente",
    "representer": "représenter",
    "resilience": "résilience",
    "reseau": "réseau",
    "reseaux": "réseaux",
    "securite": "sécurité",
    "securites": "sécurités",
    "siecle": "siècle",
    "siecles": "siècles",
    "situee": "située",
    "situees": "situées",
    "situe": "situé",
    "situes": "situés",
    "societe": "société",
    "societes": "sociétés",
    "specificite": "spécificité",
    "specificites": "spécificités",
    "specialite": "spécialité",
    "specialites": "spécialités",
    "strategique": "stratégique",
    "strategiques": "stratégiques",
    "strategie": "stratégie",
    "strategies": "stratégies",
    "superieure": "supérieure",
    "superieures": "supérieures",
    "superieur": "supérieur",

    # T
    "technicite": "technicité",
    "territoires": "territoires",
    "territoire": "territoire",
    "totalite": "totalité",
    "touristique": "touristique",
    "touristiques": "touristiques",
    "tradition": "tradition",
    "traditions": "traditions",
    "transparence": "transparence",
    "tunisee": "tunisée",

    # U
    "universite": "université",
    "universites": "universités",
    "utilite": "utilité",
    "utilites": "utilités",

    # V
    "variete": "variété",
    "varietes": "variétés",
    "vitalite": "vitalité",
    "vitalites": "vitalités",
    "vulnerabilite": "vulnérabilité",
}

# Phrase-level replacements (applied before word-level)
PHRASE_REPLACEMENTS = [
    # "a ete" → "a été" (has been)
    (r'\ba ete\b', 'a été'),
    (r'\bA ete\b', 'A été'),
    (r'\bont ete\b', 'ont été'),
    (r'\bOnt ete\b', 'Ont été'),
    (r'\bsont etes\b', 'sont étés'),
    (r'\bsera ete\b', 'sera été'),
    # "a la" meaning "at the" — only when between words (won't catch all but helps)
    # Skip "a la" → "à la" — too risky, "a" is also verb avoir
    # Specific safe phrases
    (r'\bgrâce a\b', 'grâce à'),
    (r'\bGrace a\b', 'Grâce à'),
    (r'\bjusqu a\b', "jusqu'à"),
    (r'\bpar rapport a\b', 'par rapport à'),
    # "Crete" as proper noun
    (r'\bla Crete\b', 'la Crète'),
    (r'\ben Crete\b', 'en Crète'),
    (r'\bde Crete\b', 'de Crète'),
    (r'\bde la Crete\b', 'de la Crète'),
]


def apply_replacements(text: str) -> str:
    if not text:
        return text

    # Phase 1: phrase-level
    for pattern, replacement in PHRASE_REPLACEMENTS:
        text = re.sub(pattern, replacement, text)

    # Phase 2: word-level (case-preserving)
    def replace_word(m):
        word = m.group(0)
        lower = word.lower()
        if lower not in WORD_REPLACEMENTS:
            return word
        corrected = WORD_REPLACEMENTS[lower]
        # Preserve capitalisation
        if word[0].isupper():
            corrected = corrected[0].upper() + corrected[1:]
        return corrected

    # Build pattern matching any of the keys (longest first to avoid partial matches)
    keys = sorted(WORD_REPLACEMENTS.keys(), key=len, reverse=True)
    pattern = r'\b(' + '|'.join(re.escape(k) for k in keys) + r')\b'
    text = re.sub(pattern, replace_word, text, flags=re.IGNORECASE)

    return text


def text_changed(original: str, fixed: str) -> bool:
    return original != fixed


# ─────────────────────────────────────────────────────────────
# Fetch all rewritten articles
# ─────────────────────────────────────────────────────────────
print("Fetching all rewritten=true articles from Supabase...")
all_articles = []
page = 0
page_size = 1000
while True:
    data = sb.table("news")\
        .select("id,slug,title_fr,summary_fr")\
        .eq("rewritten", True)\
        .range(page * page_size, (page + 1) * page_size - 1)\
        .execute()
    batch = data.data or []
    all_articles.extend(batch)
    if len(batch) < page_size:
        break
    page += 1

print(f"Total articles fetched: {len(all_articles)}")

# ─────────────────────────────────────────────────────────────
# Apply fixes
# ─────────────────────────────────────────────────────────────
fixed_count = 0
skipped_count = 0

for article in all_articles:
    art_id = article["id"]
    slug = article.get("slug", art_id)
    title_fr = article.get("title_fr") or ""
    summary_fr = article.get("summary_fr") or ""

    new_title_fr = apply_replacements(title_fr)
    new_summary_fr = apply_replacements(summary_fr)

    title_changed = text_changed(title_fr, new_title_fr)
    summary_changed = text_changed(summary_fr, new_summary_fr)

    if not title_changed and not summary_changed:
        skipped_count += 1
        continue

    # Show what changed
    if title_changed:
        print(f"  [title] {title_fr!r}")
        print(f"       -> {new_title_fr!r}")
    if summary_changed:
        # Show first diff only (summaries can be long)
        print(f"  [summary changed] {slug}")

    update = {}
    if title_changed:
        update["title_fr"] = new_title_fr
    if summary_changed:
        update["summary_fr"] = new_summary_fr

    sb.table("news").update(update).eq("id", art_id).execute()
    fixed_count += 1

print(f"\n{'='*50}")
print(f"Articles fixed:   {fixed_count}")
print(f"Articles unchanged: {skipped_count}")
print(f"Total processed:  {len(all_articles)}")
