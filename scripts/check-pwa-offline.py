#!/usr/bin/env python3
"""check:pwa-offline — les pages bus tiennent sans réseau (lot 1 PWA, 27/10/2026).

Joue le scénario d'un voyageur : ouvre /en/buses puis une page de trajet en ligne, coupe le
réseau, et vérifie :
  1. la page de trajet déjà vue se rouvre depuis le cache, avec le bandeau « hors ligne » ;
  2. un clic sur un lien bus vers une page déjà en cache aboutit (navigation RSC → repli) ;
  3. une page bus jamais vue tombe sur /offline.html qui liste les horaires sauvegardés ;
  4. le service worker a posté `cd-offline-served` (mesure Plausible).

Usage : python scripts/check-pwa-offline.py [port]      (défaut 3340, après `next build`)
Le script lance `next start` lui-même et l'ARRÊTE pour simuler la coupure : le mode
hors ligne de Playwright ne s'applique pas aux requêtes du service worker (vérifié
27/10/2026 : le SW récupérait une vraie 404 du serveur). `set_offline` reste utilisé pour
que `navigator.onLine` soit faux dans la page (bandeau). Prérequis : Playwright Python.
"""
import os
import subprocess
import sys
import time
import urllib.request
from playwright.sync_api import sync_playwright

port = int(sys.argv[1]) if len(sys.argv) > 1 else 3340
base = f"http://localhost:{port}"
NEXT = os.path.join("node_modules", ".bin", "next.cmd" if os.name == "nt" else "next")


def start_server():
    proc = subprocess.Popen([NEXT, "start", "-p", str(port)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for _ in range(60):
        try:
            urllib.request.urlopen(f"{base}/offline.html", timeout=2).read()
            return proc
        except Exception:
            time.sleep(1)
    proc.kill()
    sys.exit("serveur Next injoignable")


def stop_server(proc):
    if os.name == "nt":
        subprocess.run(["taskkill", "/PID", str(proc.pid), "/T", "/F"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    else:
        proc.terminate()
    proc.wait(timeout=20)
    for _ in range(20):
        try:
            urllib.request.urlopen(f"{base}/offline.html", timeout=1).read()
            time.sleep(0.5)
        except Exception:
            return


server = start_server()
HUB = f"{base}/en/buses"
PAIR = f"{base}/en/buses/heraklion-to-rethymno"
NEVER = f"{base}/en/buses/zz-never-opened"  # jamais liée ni préchargée par le hub (une vraie paire l est)
ok = True


def check(cond, label):
    global ok
    print(("  OK  " if cond else "  KO  ") + label)
    ok = ok and bool(cond)


with sync_playwright() as p:
    browser = p.chromium.launch()
    ctx = browser.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True)
    page = ctx.new_page()
    served = []
    # Stub Plausible verrouillé : le vrai script le remplacerait (et ignore localhost).
    page.add_init_script("""
      window.__cdOffline = [];
      const stub = (e, o) => { if (e === 'offline_served') window.__cdOffline.push(o && o.props ? o.props.path : ''); };
      Object.defineProperty(window, 'plausible', { get: () => stub, set: () => {}, configurable: false });
    """)

    print("en ligne : hub + trajet")
    page.goto(HUB, wait_until="networkidle")
    page.wait_for_function("navigator.serviceWorker && navigator.serviceWorker.controller !== null", timeout=20000)
    page.goto(PAIR, wait_until="networkidle")
    check(page.locator("[data-testid=offline-notice]").count() == 0, "bandeau absent en ligne")
    # Le SW met la page en cache à la réponse : on s'assure de l'entrée avant de couper.
    page.wait_for_function(
        "caches.open('cd-bus-pages-v1').then(c => c.keys()).then(ks => ks.some(k => k.url.includes('/buses/heraklion-to-rethymno')))",
        timeout=15000,
    )
    # Revenir au hub : le lien vers le trajet sera cliqué hors ligne depuis ici.
    page.goto(HUB, wait_until="networkidle")

    print("hors ligne (serveur arrêté + navigator.onLine faux)")
    stop_server(server)
    ctx.set_offline(True)

    # 1. page déjà vue, rechargée hors ligne
    page.goto(PAIR, wait_until="domcontentloaded")
    page.wait_for_selector("[data-testid=offline-notice]", timeout=10000)
    check(page.locator("[data-testid=offline-notice]").count() == 1, "trajet déjà vu : servi + bandeau hors ligne")
    check("Heraklion" in page.content(), "trajet déjà vu : contenu horaires présent")
    page.screenshot(path="shots-offline-notice.png")
    page.wait_for_function("window.__cdOffline.length > 0", timeout=5000)
    served = page.evaluate("window.__cdOffline")
    check(any("heraklion-to-rethymno" in s for s in served), f"mesure offline_served reçue ({served})")

    # 2. clic depuis le hub (navigation Next, pas une navigation plein-page) vers une page en cache
    page.goto(HUB, wait_until="domcontentloaded")
    page.wait_for_selector("[data-testid=offline-notice]", timeout=10000)
    link = page.locator(f"a[href='/en/buses/heraklion-to-rethymno']").first
    if link.count():
        link.click()
        page.wait_for_url("**/buses/heraklion-to-rethymno", timeout=15000)
        page.wait_for_selector("[data-testid=offline-notice]", timeout=10000)
        check(True, "clic hub → trajet en cache aboutit hors ligne")
    else:
        check(False, "lien heraklion-to-rethymno introuvable sur le hub")

    # 3. page jamais vue → repli
    page.goto(NEVER, wait_until="domcontentloaded")
    page.wait_for_selector("#saved", state="attached", timeout=10000)
    txt = page.content()
    check("You are offline" in txt, "page jamais vue : offline.html servie")
    page.wait_for_function("document.querySelectorAll('#saved li').length > 0", timeout=5000)
    check("heraklion-to-rethymno" in txt or page.locator("#saved li").count() > 0, "offline.html liste les horaires sauvegardés")
    page.screenshot(path="shots-offline-fallback.png", full_page=True)

    ctx.set_offline(False)
    server = start_server()
    page.goto(PAIR, wait_until="networkidle")
    check(page.locator("[data-testid=offline-notice]").count() == 0, "retour en ligne : bandeau disparu")
    browser.close()

stop_server(server)
print("check:pwa-offline", "OK" if ok else "KO")
sys.exit(0 if ok else 1)
