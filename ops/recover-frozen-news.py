#!/opt/cretepulse/venv/bin/python3
"""Recovery one-shot : degele writer-v2 apres une panne du CLI claude.

Contexte
--------
Quand le CLI `claude` tombait (OAuth expire, rate limit, timeout), l'ancien
writer-v2 renvoyait "" -> score 0 -> article marque rewritten=true /
category='filtered' A VIE. Resultat : backlog brule en silence, set traduit
gele (max(published_at) fige), alerte "News translation writer-v2" du watchdog.

Le correctif dans writer-v2.py empeche que ca se reproduise. Ce script repare
les degats DEJA faits : il remet en file les articles filtres a tort pendant la
panne pour qu'ils soient retraites au prochain run horaire de writer-v2.

Etapes
------
  1. Verifie que `claude` repond (sinon : RE-AUTH requise, on s'arrete sans
     rien toucher -- inutile de degeler si le CLI est encore mort).
  2. Compte / remet en file (rewritten=false, category=NULL) les articles
     `category='filtered'` sans title_en dans une fenetre donnee.

Limite connue : un article legitimement filtre (vraiment hors-sujet) a les
memes colonnes qu'un article brule par la panne. On ne peut pas les distinguer
apres coup, donc la remise en file en re-traite forcement quelques-uns pour
rien (ils seront re-filtres, cout : quelques appels haiku). D'ou la fenetre
bornee : cible la duree de la panne, pas tout l'historique.

Usage (sur le VPS)
------------------
  python3 ops/recover-frozen-news.py --hours 24           # dry-run : compte seulement
  python3 ops/recover-frozen-news.py --hours 24 --yes     # applique la remise en file
"""
import argparse
import os
import subprocess
import sys

import psycopg2
from dotenv import load_dotenv

load_dotenv("/opt/cretepulse-db/.env")

DB = dict(host="localhost", port=5433, dbname="cretepulse",
          user="postgres", password=os.environ["POSTGRES_PASSWORD"])


def claude_alive():
    """Meme preflight que writer-v2 : un appel trivial doit renvoyer du texte."""
    try:
        r = subprocess.run(
            ["claude", "-p", "Reply with exactly: OK", "--model", "haiku"],
            capture_output=True, text=True, timeout=60,
        )
    except Exception as e:
        print(f"  claude introuvable/timeout : {e}")
        return False
    if r.returncode != 0:
        err = (r.stderr or "").strip().replace("\n", " ")[:200]
        print(f"  claude exit {r.returncode} : {err}")
        return False
    return bool(r.stdout.strip())


def main():
    ap = argparse.ArgumentParser(description="Degele writer-v2 apres une panne claude.")
    ap.add_argument("--hours", type=int, default=24,
                    help="Fenetre de remise en file (published_at >= now()-Nh). Defaut 24.")
    ap.add_argument("--yes", action="store_true",
                    help="Applique reellement la remise en file (sinon dry-run).")
    ap.add_argument("--skip-claude-check", action="store_true",
                    help="Ne pas verifier claude (a n'utiliser que si tu sais qu'il est OK).")
    args = ap.parse_args()

    if not args.skip_claude_check:
        print("[recover] preflight claude...")
        if not claude_alive():
            print("[recover] STOP : le CLI claude ne repond pas.")
            print("          Re-authentifie-le d'abord (sous l'utilisateur du cron) :")
            print("            claude   # puis suis le flux OAuth navigateur")
            print("          Verifie ensuite : claude -p 'ok' --model haiku")
            print("          Puis relance ce script. Rien n'a ete touche.")
            sys.exit(1)
        print("[recover] claude OK.")

    where = ("category = 'filtered' "
             "AND coalesce(title_en,'') = '' "
             "AND published_at >= now() - make_interval(hours => %s)")

    conn = psycopg2.connect(**DB)
    conn.autocommit = True
    with conn.cursor() as cur:
        cur.execute(f"SELECT count(*) FROM news WHERE {where}", (args.hours,))
        n = cur.fetchone()[0]
        print(f"[recover] {n} article(s) filtre(s) sans title_en sur les {args.hours} dernieres heures.")

        if n == 0:
            print("[recover] Rien a remettre en file.")
        elif not args.yes:
            print("[recover] DRY-RUN : ajoute --yes pour appliquer la remise en file.")
        else:
            cur.execute(
                f"UPDATE news SET rewritten = false, category = NULL WHERE {where}",
                (args.hours,),
            )
            print(f"[recover] {cur.rowcount} article(s) remis en file (rewritten=false).")
            print("[recover] writer-v2 les retraitera au prochain run horaire "
                  "(ou lance-le a la main maintenant).")
    conn.close()


if __name__ == "__main__":
    main()
