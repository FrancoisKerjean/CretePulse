# Verification visuelle du produit taxi partners (next start sur le build local).
# Run: py -3 scripts/test-taxi-ui.py [--with-partner]
# Le serveur doit deja tourner sur localhost:3000.
import json
import sys
from playwright.sync_api import sync_playwright

BASE = "http://localhost:3000"
WITH_PARTNER = "--with-partner" in sys.argv
ok = 0


def check(name: str, cond: bool) -> None:
    global ok
    assert cond, f"FAIL: {name}"
    ok += 1
    print(f"PASS: {name}")


with sync_playwright() as pw:
    b = pw.chromium.launch()
    page = b.new_page()

    # 1. Page paire FR : bloc taxi + FAQ JSON-LD
    page.goto(f"{BASE}/fr/buses/heraklion-to-ierapetra", wait_until="domcontentloaded")
    check("pair FR: bloc 'En taxi'", page.locator("text=En taxi :").count() >= 1)
    html = page.content()
    check("pair FR: methodo compteur", "compteur" in html)
    schemas = page.locator('script[type="application/ld+json"]').all_text_contents()
    faq_ok = any("taxi de Heraklion" in s for s in schemas)
    check("pair FR: FAQ taxi dans JSON-LD", faq_ok)
    if WITH_PARTNER:
        check("pair FR: badge Sponsorise", page.locator("text=Sponsorisé").count() >= 1)
        check("pair FR: bouton tel:", page.locator('a[href^="tel:"]').count() >= 1)
    else:
        check("pair FR: ligne inbound /partners", page.locator('a[href="/fr/partners"]').count() >= 1)

    # 2. Planificateur EN : bloc compact apres selection
    page.goto(f"{BASE}/en/buses?from=Heraklion&to=Ierapetra", wait_until="domcontentloaded")
    page.wait_for_selector("text=By taxi :", timeout=15000)
    check("planner EN: bloc compact 'By taxi'", True)

    # 3. /partners EN + EL
    page.goto(f"{BASE}/en/partners", wait_until="domcontentloaded")
    check("partners EN: H1", page.locator("h1").first.inner_text().startswith("Taxi partners"))
    if WITH_PARTNER:
        check("partners EN: 6 Available + 1 Taken", page.get_by_text("Available", exact=True).count() == 6
              and page.get_by_text("Taken", exact=True).count() == 1)
    else:
        check("partners EN: 7 zones Available", page.get_by_text("Available", exact=True).count() == 7)
    check("partners EN: prix 49", page.locator("text=49 €/month per zone").count() == 1)
    check("partners EN: CTA Stripe", page.locator('a[href*="buy.stripe.com"]').count() >= 1)
    page.goto(f"{BASE}/el/partners", wait_until="domcontentloaded")
    expected_el = 6 if WITH_PARTNER else 7
    check("partners EL: zones", page.get_by_text("Διαθέσιμη", exact=True).count() == expected_el)

    b.close()

print(f"OK test-taxi-ui: {ok} assertions" + (" (with partner)" if WITH_PARTNER else ""))
