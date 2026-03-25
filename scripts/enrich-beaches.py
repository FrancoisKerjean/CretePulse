#!/usr/bin/env python3
"""
Enrich beach data with better descriptions and fix kids_friendly defaults.
Uses Claude to generate proper descriptions based on beach attributes + location.
Run manually: python scripts/enrich-beaches.py
"""

import os
import sys
import json
import subprocess
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
if not SUPABASE_URL or not SUPABASE_KEY:
    print("[enrich] ERROR: missing env vars"); sys.exit(1)

from supabase import create_client
sb = create_client(SUPABASE_URL, SUPABASE_KEY)

# Beaches known to be kid-friendly (shallow, sandy, calm)
KNOWN_KID_FRIENDLY = [
    "elafonisi", "falassarna", "balos", "marathi", "stavros",
    "agia marina", "almyrida", "georgioupoli", "panormo",
    "bali", "plakias", "matala", "ammoudara", "amoudara",
    "karteros", "sissi", "milatos", "istro", "vai",
    "kouremenos", "makrigialos", "ierapetra",
    "agia pelagia", "ligaria", "loutro",
    "frangokastello", "damnoni", "preveli",
    "malia", "stalis", "hersonissos",
    "rethymno", "platanias", "kolymbari",
]


def fix_kids_friendly():
    """Fix the blanket kids_friendly=false. Set true for sandy sheltered beaches."""
    data = sb.table("beaches").select("id,slug,name_en,type,wind_exposure,kids_friendly").execute()
    beaches = data.data or []

    updated = 0
    for b in beaches:
        slug = b["slug"].lower()
        name = (b.get("name_en") or "").lower()

        should_be_friendly = False

        # Check known kid-friendly list
        for kf in KNOWN_KID_FRIENDLY:
            if kf in slug or kf in name:
                should_be_friendly = True
                break

        # Sandy + sheltered/moderate = kid-friendly
        if b.get("type") == "sand" and b.get("wind_exposure") in ("sheltered", "moderate"):
            should_be_friendly = True

        if should_be_friendly and not b.get("kids_friendly"):
            try:
                sb.table("beaches").update({"kids_friendly": True}).eq("id", b["id"]).execute()
                updated += 1
                print(f"[enrich] kids_friendly=true: {b['slug']}")
            except Exception as e:
                print(f"[enrich] ERROR: {e}")

    print(f"[enrich] Updated {updated} beaches to kids_friendly=true")


def enrich_descriptions():
    """Generate proper descriptions for beaches with short/generic ones."""
    data = sb.table("beaches").select("*").execute()
    beaches = data.data or []

    # Find beaches with short descriptions (< 150 chars = probably auto-generated)
    needs_enrichment = [b for b in beaches if len(b.get("description_en") or "") < 150]
    print(f"[enrich] {len(needs_enrichment)} beaches need better descriptions")

    # Process in batches of 5
    for i in range(0, len(needs_enrichment), 5):
        batch = needs_enrichment[i:i+5]
        beach_info = []
        for b in batch:
            info = f"- {b['name_en']} ({b['region']}): type={b['type']}, wind={b['wind_exposure']}, " \
                   f"parking={b['parking']}, sunbeds={b['sunbeds']}, taverna={b['taverna']}, " \
                   f"snorkeling={b['snorkeling']}, kids={b['kids_friendly']}, " \
                   f"lat={b['latitude']}, lon={b['longitude']}"
            beach_info.append(info)

        prompt = f"""Write short descriptions (2-3 sentences, max 200 chars) for these Crete beaches.
For each beach, mention: what makes it special, water clarity, best time to visit, practical tip.
Do NOT fabricate - if you don't know the beach, write a generic but useful description based on the attributes.

Beaches:
{chr(10).join(beach_info)}

Return ONLY a JSON array with objects:
[{{"name": "BeachName", "description_en": "...", "description_fr": "...", "description_de": "..."}}]

French: mandatory accents. German: korrekt."""

        try:
            result = subprocess.run(
                ["claude", "-p", prompt, "--model", "haiku"],
                capture_output=True, text=True, timeout=120
            )
            output = result.stdout.strip()
        except Exception as e:
            print(f"[enrich] Claude error: {e}")
            continue

        # Parse JSON
        start = output.find("[")
        end = output.rfind("]") + 1
        if start == -1 or end == 0:
            print(f"[enrich] No JSON array in response")
            continue

        try:
            descriptions = json.loads(output[start:end])
        except json.JSONDecodeError:
            print(f"[enrich] Bad JSON")
            continue

        # Match and update
        for desc in descriptions:
            name = desc.get("name", "")
            matching = [b for b in batch if b["name_en"].lower() == name.lower()]
            if not matching:
                # Try partial match
                matching = [b for b in batch if name.lower() in b["name_en"].lower()]
            if matching:
                b = matching[0]
                update = {}
                if desc.get("description_en"):
                    update["description_en"] = desc["description_en"]
                if desc.get("description_fr"):
                    update["description_fr"] = desc["description_fr"]
                if desc.get("description_de"):
                    update["description_de"] = desc["description_de"]
                if update:
                    try:
                        sb.table("beaches").update(update).eq("id", b["id"]).execute()
                        print(f"[enrich] updated descriptions: {b['slug']}")
                    except Exception as e:
                        print(f"[enrich] ERROR: {e}")

    print("[enrich] Description enrichment done")


def main():
    print("[enrich] Starting beach data enrichment")
    fix_kids_friendly()
    enrich_descriptions()
    print("[enrich] Done")


if __name__ == "__main__":
    main()
