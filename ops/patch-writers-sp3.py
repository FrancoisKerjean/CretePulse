#!/usr/bin/env python3
"""SP3: inject photo_library bank lookup into the two writers, before stock fetch.
Local import + try/except => zero risk (if photo_picker import/query fails, the
writer falls back to its normal Pexels/Wikimedia fetch). Backs up both files."""
import shutil, sys

GW = "/opt/cretepulse/guide-writer.py"
L1 = "/opt/cretepulse-content/writer-l1.py"

# --- guide-writer.py ---
gw_old = '''    keywords = (topic or {}).get("keywords", []) if topic else []
'''
gw_new = '''    keywords = (topic or {}).get("keywords", []) if topic else []
    # SP3: prefer a matching photo from our photothèque bank over stock.
    try:
        from photo_picker import pick_library_photo
        _bank = pick_library_photo(category, keywords, title)
    except Exception:
        _bank = None
    if _bank:
        print(f"[guide-writer] Using photothèque bank photo: {_bank[:90]}")
        return _bank
'''

# --- writer-l1.py ---
l1_old = '''        hero_query = data.get("hero_image_query", f"Crete Greece {category}")
        image_url = fetch_hero_image(hero_query)
'''
l1_new = '''        hero_query = data.get("hero_image_query", f"Crete Greece {category}")
        # SP3: prefer a matching photo from our photothèque bank over stock.
        image_url = None
        try:
            from photo_picker import pick_library_photo
            image_url = pick_library_photo(category, data.get("keywords") or [],
                                           data.get("title_en") or data.get("title") or "")
            if image_url:
                log(f"Hero from photothèque bank: {image_url[:80]}")
        except Exception:
            image_url = None
        if not image_url:
            image_url = fetch_hero_image(hero_query)
'''

for path, old, new, name in [(GW, gw_old, gw_new, "guide-writer"),
                             (L1, l1_old, l1_new, "writer-l1")]:
    src = open(path, encoding="utf-8").read()
    if new.strip() in src:
        print(f"[{name}] already patched, skip")
        continue
    if old not in src:
        print(f"!! ABORT [{name}]: anchor not found verbatim")
        sys.exit(1)
    if src.count(old) != 1:
        print(f"!! ABORT [{name}]: anchor not unique ({src.count(old)}x)")
        sys.exit(1)
    shutil.copy(path, path + ".bak-20260609-sp3")
    open(path, "w", encoding="utf-8").write(src.replace(old, new))
    print(f"[{name}] patched OK (backup .bak-20260609-sp3)")
