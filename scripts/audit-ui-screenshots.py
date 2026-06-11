# Audit visuel : screenshots prod desktop + mobile des pages cles.
# Run: py -3 scripts/audit-ui-screenshots.py
from pathlib import Path
from playwright.sync_api import sync_playwright

OUT = Path("ui-audit")
OUT.mkdir(exist_ok=True)
BASE = "https://crete.direct"

PAGES = [
    ("home", "/en"),
    ("buses", "/en/buses?from=Heraklion&to=Ierapetra"),
    ("pair", "/en/buses/heraklion-to-ierapetra"),
    ("partners", "/en/partners"),
    ("things-to-do", "/en/things-to-do/chania"),
    ("beach-today", "/en/beaches/today"),
    ("airbnb", "/en/airbnb/ierapetra"),
    ("article-hub", "/en/articles"),
]

VIEWPORTS = [("desktop", 1440, 900), ("mobile", 390, 844)]

with sync_playwright() as pw:
    b = pw.chromium.launch()
    for vp_name, w, h in VIEWPORTS:
        ctx = b.new_context(viewport={"width": w, "height": h},
                            device_scale_factor=1)
        page = ctx.new_page()
        for name, path in PAGES:
            try:
                page.goto(f"{BASE}{path}", wait_until="networkidle", timeout=45000)
            except Exception:
                pass  # networkidle peut timeouter (analytics) : on shoote quand meme
            page.wait_for_timeout(1500)
            f = OUT / f"{name}-{vp_name}.png"
            page.screenshot(path=str(f), full_page=True)
            print(f"shot {f}")
        ctx.close()
    b.close()
print("done")
