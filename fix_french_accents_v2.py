#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Fix missing French accents in Supabase news table.
Uses direct HTTP REST API with proper UTF-8 handling.
"""
import sys
import os
import re
import json
import urllib.request
import urllib.error

sys.stdout.reconfigure(encoding='utf-8')

SUPABASE_URL = "https://fzofxinjsuexjoxlwrhg.supabase.co"
ANON_KEY = "sb_publishable_9KIRJh01jgKZ4X5XCpik-w_jWT9BmAX"

# ─────────────────────────────────────────────────────────────
# Comprehensive French accent restoration dictionary
# Key: unaccented lowercase, Value: accented form
# Longer/more specific entries first to avoid partial matches
# ─────────────────────────────────────────────────────────────
WORDS = {
    # A
    "aeroport": "aéroport",
    "aeroports": "aéroports",
    "agrement": "agrément",
    "amelioration": "amélioration",
    "ameliorations": "améliorations",
    "ameliore": "amélioré",
    "amelioree": "améliorée",
    "ameliorer": "améliorer",
    "amenagement": "aménagement",
    "amenagements": "aménagements",
    "annee": "année",
    "annees": "années",
    "anterieure": "antérieure",
    "anterieures": "antérieures",
    "anterieur": "antérieur",
    "anterieurs": "antérieurs",
    "apres": "après",
    "arrete": "arrêté",
    "arretee": "arrêtée",
    "arretes": "arrêtés",
    "assemblee": "assemblée",
    "autorite": "autorité",
    "autorites": "autorités",
    "avere": "avéré",

    # B
    "batiment": "bâtiment",
    "batiments": "bâtiments",
    "benefice": "bénéfice",
    "benefices": "bénéfices",
    "beneficiaire": "bénéficiaire",
    "beneficiaires": "bénéficiaires",
    "beneficier": "bénéficier",

    # C
    "capacite": "capacité",
    "capacites": "capacités",
    "celebre": "célèbre",
    "celebres": "célèbres",
    "celebree": "célébrée",
    "celebration": "célébration",
    "celebrer": "célébrer",
    "cle": "clé",
    "cles": "clés",
    "collectivite": "collectivité",
    "collectivites": "collectivités",
    "communaute": "communauté",
    "communautes": "communautés",
    "complete": "complète",
    "completement": "complètement",
    "complexite": "complexité",
    "conference": "conférence",
    "conferences": "conférences",
    "continuite": "continuité",
    "cree": "créé",
    "creee": "créée",
    "crees": "créés",
    "creees": "créées",
    "creer": "créer",
    "crete": "Crète",

    # D
    "dedie": "dédié",
    "dediee": "dédiée",
    "dedies": "dédiés",
    "delegue": "délégué",
    "delegues": "délégués",
    "definition": "définition",
    "definitions": "définitions",
    "dependance": "dépendance",
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
    "difficulte": "difficulté",
    "difficultes": "difficultés",
    "disponibilite": "disponibilité",
    "diversite": "diversité",

    # E
    "echange": "échange",
    "echanges": "échanges",
    "echelle": "échelle",
    "economie": "économie",
    "economies": "économies",
    "economique": "économique",
    "economiques": "économiques",
    "efficacite": "efficacité",
    "egalite": "égalité",
    "egalement": "également",
    "election": "élection",
    "elections": "élections",
    "electricite": "électricité",
    "electrique": "électrique",
    "energie": "énergie",
    "energies": "énergies",
    "energetique": "énergétique",
    "equilibre": "équilibre",
    "equipement": "équipement",
    "equipements": "équipements",
    "etape": "étape",
    "etapes": "étapes",
    "etat": "état",
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

    # G
    "generale": "générale",
    "generales": "générales",
    "general": "général",
    "generaux": "généraux",
    "generation": "génération",
    "generations": "générations",
    "gere": "géré",
    "geree": "gérée",
    "geres": "gérés",
    "grece": "Grèce",

    # I
    "identite": "identité",
    "immediat": "immédiat",
    "immediate": "immédiate",
    "integration": "intégration",
    "integre": "intégré",
    "integree": "intégrée",
    "interet": "intérêt",
    "interets": "intérêts",

    # L
    "liberte": "liberté",
    "localite": "localité",
    "localites": "localités",

    # M
    "majorite": "majorité",
    "medecin": "médecin",
    "medecins": "médecins",
    "memoire": "mémoire",
    "meteo": "météo",
    "metropole": "métropole",
    "mobilite": "mobilité",
    "municipalite": "municipalité",
    "municipalites": "municipalités",

    # N
    "necessite": "nécessité",
    "negociation": "négociation",
    "negociations": "négociations",

    # O
    "opportunite": "opportunité",
    "opportunites": "opportunités",
    "operation": "opération",
    "operations": "opérations",
    "operationnel": "opérationnel",
    "operationnelle": "opérationnelle",

    # P
    "periode": "période",
    "periodes": "périodes",
    "phenomene": "phénomène",
    "popularite": "popularité",
    "prefecture": "préfecture",
    "premiere": "première",
    "premieres": "premières",
    "priorite": "priorité",
    "priorites": "priorités",
    "probleme": "problème",
    "problemes": "problèmes",
    "procedure": "procédure",
    "procedures": "procédures",
    "propriete": "propriété",
    "proprietes": "propriétés",

    # Q
    "qualite": "qualité",
    "qualites": "qualités",

    # R
    "realise": "réalisé",
    "realisee": "réalisée",
    "realisation": "réalisation",
    "realisations": "réalisations",
    "recent": "récent",
    "recente": "récente",
    "recents": "récents",
    "region": "région",
    "regions": "régions",
    "regional": "régional",
    "regionale": "régionale",
    "reglementation": "réglementation",
    "renovation": "rénovation",
    "renovations": "rénovations",
    "renove": "rénové",
    "renovee": "rénovée",
    "reseau": "réseau",
    "reseaux": "réseaux",

    # S
    "securite": "sécurité",
    "siecle": "siècle",
    "siecles": "siècles",
    "societe": "société",
    "societes": "sociétés",
    "strategique": "stratégique",
    "strategiques": "stratégiques",
    "strategie": "stratégie",
    "strategies": "stratégies",
    "superieure": "supérieure",
    "superieures": "supérieures",
    "superieur": "supérieur",

    # T
    "totalite": "totalité",
    "universite": "université",
    "universites": "universités",
    "utilite": "utilité",

    # V
    "variete": "variété",
    "varietes": "variétés",
    "vitalite": "vitalité",
}

# Phrase-level (applied first, most specific)
PHRASES = [
    # "a ete" → "a été"
    (r'(?<=[a-zA-ZÀ-ÿ\s])a ete\b', 'a été'),
    (r'\bont ete\b', 'ont été'),
    # "direction a l'" → "direction à l'"
    (r'\bdirection a l\'', "direction à l'"),
    (r'\bdirection a la\b', 'direction à la'),
    (r'\bdirection a les\b', 'direction à les'),
    # Generic "X a Y" where a=à before article
    (r'\b(apportant une (?:nouvelle |grande )?direction) a (l\'|la\b|les\b|un\b|une\b)', r'\1 à \2'),
    # "grace a" → "grâce à"
    (r'\bgrâce a\b', 'grâce à'),
    (r'\bGrâce a\b', 'Grâce à'),
    (r'\bgrace a\b', 'grâce à'),
    (r'\bGrace a\b', 'Grâce à'),
    # Crete proper noun with article
    (r'\bla Crete\b', 'la Crète'),
    (r'\ben Crete\b', 'en Crète'),
    (r'\bde Crete\b', 'de Crète'),
    (r'\bCrete\b', 'Crète'),
    # Canee
    (r'\bCanee\b', 'Canée'),
    (r'\bla Canee\b', 'la Canée'),
]


def apply_fixes(text: str) -> str:
    if not text:
        return text

    # Phase 1: phrase replacements
    for pattern, repl in PHRASES:
        text = re.sub(pattern, repl, text)

    # Phase 2: word replacements (word-boundary, case-preserving)
    # Sort keys longest-first to avoid shorter keys matching inside longer words
    sorted_keys = sorted(WORDS.keys(), key=len, reverse=True)
    pattern = r'(?<![a-zA-ZÀ-ÿ\-])(' + '|'.join(re.escape(k) for k in sorted_keys) + r')(?![a-zA-ZÀ-ÿ\-])'

    def replacer(m):
        word = m.group(1)
        lower = word.lower()
        corrected = WORDS.get(lower)
        if not corrected:
            return word
        # Preserve original capitalisation
        if word[0].isupper() and not corrected[0].isupper():
            corrected = corrected[0].upper() + corrected[1:]
        return corrected

    text = re.sub(pattern, replacer, text, flags=re.IGNORECASE)
    return text


# ─────────────────────────────────────────────────────────────
# Fetch all articles via REST
# ─────────────────────────────────────────────────────────────
def fetch_all():
    all_rows = []
    offset = 0
    page_size = 1000
    while True:
        url = (f"{SUPABASE_URL}/rest/v1/news"
               f"?select=id,slug,title_fr,summary_fr"
               f"&rewritten=eq.true"
               f"&limit={page_size}&offset={offset}"
               f"&order=id.asc")
        req = urllib.request.Request(
            url,
            headers={
                'apikey': ANON_KEY,
                'Authorization': f'Bearer {ANON_KEY}',
                'Accept': 'application/json',
            }
        )
        with urllib.request.urlopen(req) as r:
            batch = json.loads(r.read().decode('utf-8'))
        all_rows.extend(batch)
        if len(batch) < page_size:
            break
        offset += page_size
    return all_rows


def patch_article(art_id, update: dict):
    url = f"{SUPABASE_URL}/rest/v1/news?id=eq.{art_id}"
    body = json.dumps(update).encode('utf-8')
    req = urllib.request.Request(
        url,
        data=body,
        headers={
            'apikey': ANON_KEY,
            'Authorization': f'Bearer {ANON_KEY}',
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
        },
        method='PATCH'
    )
    with urllib.request.urlopen(req) as r:
        return r.status


# ─────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────
print("Fetching all rewritten=true articles...")
articles = fetch_all()
print(f"Total articles: {len(articles)}")

fixed_count = 0
skipped_count = 0

for art in articles:
    art_id = art['id']
    slug = art.get('slug', str(art_id))
    title_fr = art.get('title_fr') or ''
    summary_fr = art.get('summary_fr') or ''

    new_title = apply_fixes(title_fr)
    new_summary = apply_fixes(summary_fr)

    title_changed = new_title != title_fr
    summary_changed = new_summary != summary_fr

    if not title_changed and not summary_changed:
        skipped_count += 1
        continue

    update = {}
    if title_changed:
        update['title_fr'] = new_title
        print(f"\n[TITLE FIX] {slug}")
        print(f"  BEFORE: {title_fr}")
        print(f"  AFTER:  {new_title}")
    if summary_changed:
        update['summary_fr'] = new_summary
        # Show diffs in summary
        print(f"\n[SUMMARY FIX] {slug}")
        # Find changed words
        words_before = title_fr.split() if title_changed else []
        # Quick diff: show first 200 chars difference
        for i, (a, b) in enumerate(zip(summary_fr, new_summary)):
            if a != b:
                start = max(0, i-30)
                end = min(len(new_summary), i+60)
                print(f"  ...{summary_fr[start:i+40]!r}")
                print(f"  ...{new_summary[start:end]!r}")
                break

    status = patch_article(art_id, update)
    print(f"  -> PATCHED (HTTP {status})")
    fixed_count += 1

print(f"\n{'='*50}")
print(f"Articles fixed:     {fixed_count}")
print(f"Articles unchanged: {skipped_count}")
print(f"Total processed:    {len(articles)}")
