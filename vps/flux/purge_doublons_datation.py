#!/usr/bin/env python3
"""Purge les vols dates de la veille par le bug d'ancrage de assign_service_dates.

Contexte : jusqu'au 29/08/2026, une capture tombant dans le creux nocturne d'un aeroport
(HER n'a aucun vol entre ~02:00 et 06:05) faisait reculer TOUT le tableau d'un jour. Les
vols du jour J etaient alors ecrits une seconde fois au jour J-1, ou ils s'ajoutaient aux
vrais. Le correctif est en place (ANCRAGE_VEILLE_MIN) ; ce script nettoie l'existant.

Critere de suppression, volontairement etroit -- les DEUX conditions :
  1. la ligne a ete vue pour la premiere fois APRES son jour de service ;
  2. il existe au jour suivant une ligne de meme (aeroport, sens, numero, horaire).
La seconde condition est ce qui distingue un doublon de datation d'un vol reellement
tardif. Mesure du 29/08 : 2 986 lignes remplissent la premiere condition, 2 816 les deux.
Les 170 restantes ne sont PAS touchees.

Reversible : les lignes partent d'abord dans flux_flight_arrivals_purge_20260829.
Pour annuler :
  INSERT INTO flux_flight_arrivals SELECT * FROM flux_flight_arrivals_purge_20260829;

Lancer :  cd /opt/cretepulse/flux && python3 purge_doublons_datation.py --ecrire
Sans --ecrire, le script ne fait que compter.
"""

import sys

import db

ARCHIVE = "flux_flight_arrivals_purge_20260829"

CRITERE = """
  (f.first_seen_at AT TIME ZONE 'Europe/Athens')::date > f.service_date
  AND EXISTS (
    SELECT 1 FROM flux_flight_arrivals g
    WHERE g.airport = f.airport AND g.direction = f.direction
      AND g.service_date = f.service_date + 1
      AND g.flight_no = f.flight_no AND g.sched_time = f.sched_time
  )
"""


def main():
    ecrire = "--ecrire" in sys.argv
    conn = db.connect()
    conn.autocommit = False
    cur = conn.cursor()

    cur.execute("SELECT COUNT(*) FROM flux_flight_arrivals f WHERE " + CRITERE)
    a_purger = cur.fetchone()[0]

    cur.execute("""
        SELECT airport, direction, COUNT(*), COUNT(DISTINCT service_date)
        FROM flux_flight_arrivals f WHERE """ + CRITERE + """
        GROUP BY 1, 2 ORDER BY 1, 2
    """)
    print("A purger : %d lignes" % a_purger)
    for airport, sens, n, jours in cur.fetchall():
        print("   %-4s %-10s %5d lignes sur %2d journees" % (airport, sens, n, jours))

    if not ecrire:
        print("\nSimulation. Relancer avec --ecrire pour appliquer.")
        conn.rollback()
        return 0

    if not a_purger:
        print("\nRien a purger.")
        conn.rollback()
        return 0

    cur.execute("SELECT to_regclass(%s)", (ARCHIVE,))
    if cur.fetchone()[0] is not None:
        print("\nLa table %s existe deja : purge deja passee, on ne rejoue pas." % ARCHIVE)
        conn.rollback()
        return 1

    cur.execute("CREATE TABLE %s AS SELECT f.* FROM flux_flight_arrivals f WHERE %s"
                % (ARCHIVE, CRITERE))
    cur.execute("SELECT COUNT(*) FROM " + ARCHIVE)
    archivees = cur.fetchone()[0]

    cur.execute("DELETE FROM flux_flight_arrivals f WHERE " + CRITERE)
    supprimees = cur.rowcount

    if archivees != supprimees or supprimees != a_purger:
        print("\nIncoherence : %d comptees, %d archivees, %d supprimees. ROLLBACK."
              % (a_purger, archivees, supprimees))
        conn.rollback()
        return 1

    conn.commit()
    print("\n%d lignes archivees dans %s, puis supprimees." % (supprimees, ARCHIVE))
    print("Annulation possible : INSERT INTO flux_flight_arrivals SELECT * FROM %s;" % ARCHIVE)
    return 0


if __name__ == "__main__":
    sys.exit(main())
