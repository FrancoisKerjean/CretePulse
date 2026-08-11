#!/usr/bin/env python3
"""Etape 2 sur 3 du rapatriement des photos /stays. A LANCER SUR LE VPS, EN ROOT.

Ajoute le chemin /stays/* au bloc media.crete.direct du Caddyfile, avec le meme
cache de 31 jours que /places : ces photos sont immuables, elles sont nommees
par position.

⛔ Caddy sert TOUS les sites du VPS, crete.direct compris : un Caddyfile invalide
les fait tomber ensemble. D ou l ordre sauvegarde -> fichier temporaire ->
`caddy validate` -> remplacement SEULEMENT si la validation passe.

Idempotent : ne fait rien si le chemin existe deja.
Ne recharge PAS Caddy : `systemctl reload caddy` reste un geste explicite.
"""
import shutil
import subprocess
import sys
import time

CADDYFILE = "/etc/caddy/Caddyfile"
# On s ancre sur le bloc suivant plutot que sur un numero de ligne : le fichier
# bouge, et une insertion au mauvais endroit casserait un autre site.
ANCRE = "\thandle_path /photos/* {"
BLOC = """\thandle_path /stays/* {
\t\troot * /opt/cretepulse-media/stays
\t\theader Cache-Control "public, max-age=2678400"
\t\theader Access-Control-Allow-Origin "*"
\t\tfile_server {
\t\t\tbrowse off
\t\t}
\t}

"""

src = open(CADDYFILE, encoding="utf-8").read()

if "handle_path /stays/*" in src:
    print("deja present, rien a faire")
    sys.exit(0)

if src.count(ANCRE) != 1:
    print(f"ancre introuvable ou ambigue ({src.count(ANCRE)} occurrence(s)), on ne touche a rien")
    sys.exit(1)

tmp = "/tmp/Caddyfile.candidat"
open(tmp, "w", encoding="utf-8").write(src.replace(ANCRE, BLOC + ANCRE, 1))

r = subprocess.run(["caddy", "validate", "--config", tmp, "--adapter", "caddyfile"],
                   capture_output=True, text=True)
if r.returncode != 0:
    print("VALIDATION ECHOUEE, Caddyfile inchange :")
    print((r.stderr or r.stdout)[-1500:])
    sys.exit(1)
print("validation OK")

bak = f"{CADDYFILE}.bak-pre-stays-{time.strftime('%Y%m%d-%H%M%S')}"
shutil.copy2(CADDYFILE, bak)
print("sauvegarde :", bak)

shutil.move(tmp, CADDYFILE)
print("Caddyfile mis a jour. Reste a lancer : systemctl reload caddy")
