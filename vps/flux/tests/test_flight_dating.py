"""Datation des vols HER et reconciliation des horaires retardes.

Regression du 29/07/2026 : le tableau HER etait date depuis son entete
"Last Update" (date locale d'Athenes) alors que le tableau commence ~1-2 h dans
le PASSE. Entre 00 h et ~02 h locales, ses premieres lignes appartiennent a la
veille : tout le tableau partait +1 jour. Combine a un incrementeur de minuit
non borne, une capture pouvait produire jusqu'a 4 dates de service distinctes.
"""
from datetime import date, datetime

from flux.parsers import assign_service_dates, pick_slot

ATHENS_NOON = datetime(2026, 7, 29, 16, 0)      # capture en pleine journee
ATHENS_MIDNIGHT = datetime(2026, 7, 28, 0, 10)  # capture juste apres minuit


def _rows(*times):
    return [{"sched_time": t} for t in times]


# --- datation ancree sur l'heure de capture ---------------------------------

def test_journee_normale_un_seul_passage_de_minuit():
    # Capture a 16:00, tableau 14:05 -> 15:45 le lendemain : base = aujourd'hui.
    rows = assign_service_dates(_rows("14:05", "23:40", "00:05", "15:45"), ATHENS_NOON)
    assert [r["service_date"] for r in rows] == [
        date(2026, 7, 29), date(2026, 7, 29), date(2026, 7, 30), date(2026, 7, 30)]


def test_capture_apres_minuit_les_premieres_lignes_sont_de_la_veille():
    # Capture a 00:10 le 28 : les lignes a 23:00 sont les vols du 27, pas du 28.
    rows = assign_service_dates(_rows("23:00", "23:50", "00:05", "22:40"), ATHENS_MIDNIGHT)
    assert [r["service_date"] for r in rows] == [
        date(2026, 7, 27), date(2026, 7, 27), date(2026, 7, 28), date(2026, 7, 28)]


def test_jamais_plus_de_deux_jours_de_service():
    # Tri imparfait / lignes hors sequence : un tableau de ~25 h ne peut couvrir
    # que 2 dates civiles, quel que soit le nombre de reculs horaires.
    rows = assign_service_dates(
        _rows("14:05", "23:40", "00:05", "06:00", "02:30", "15:45", "03:00"), ATHENS_NOON)
    assert sorted({r["service_date"] for r in rows}) == [date(2026, 7, 29), date(2026, 7, 30)]


def test_tableau_sans_passage_de_minuit():
    rows = assign_service_dates(_rows("07:15", "12:00", "18:30"), datetime(2026, 7, 29, 8, 20))
    assert all(r["service_date"] == date(2026, 7, 29) for r in rows)


def test_premiere_ligne_legerement_dans_le_futur():
    # Le tableau peut demarrer quelques minutes apres l'heure de capture.
    rows = assign_service_dates(_rows("08:35", "09:00"), datetime(2026, 7, 29, 8, 20))
    assert all(r["service_date"] == date(2026, 7, 29) for r in rows)


def test_jitter_de_tri_inferieur_a_une_heure_ne_change_pas_de_jour():
    rows = assign_service_dates(_rows("14:20", "14:15", "22:00"), ATHENS_NOON)
    assert all(r["service_date"] == date(2026, 7, 29) for r in rows)


def test_lignes_sans_heure_exploitable():
    rows = assign_service_dates([{"sched_time": None}, {"sched_time": "14:05"}], ATHENS_NOON)
    assert rows[0]["service_date"] == date(2026, 7, 29)
    assert rows[1]["service_date"] == date(2026, 7, 29)


# --- reconciliation des horaires retardes -----------------------------------

def test_pick_slot_aucun_existant():
    assert pick_slot([], "10:40") is None


def test_pick_slot_retard_rattache_au_creneau_existant():
    # DE1583 09:55 -> "New Time 10:40" : meme vol, pas une nouvelle ligne.
    assert pick_slot([(7, "09:55")], "10:40") == 7


def test_pick_slot_deux_rotations_du_meme_numero_restent_distinctes():
    # GQ 560 vole a 00:15 puis 20:25 le meme jour : deux vols reels.
    assert pick_slot([(1, "00:15")], "20:25") is None


def test_pick_slot_choisit_le_creneau_le_plus_proche():
    assert pick_slot([(1, "00:15"), (2, "20:25")], "20:40") == 2


def test_pick_slot_accepte_un_retard_de_trois_heures():
    # Retard maximal observe en base : 12:45 -> 15:45 (CHQ, statut "Delayed").
    assert pick_slot([(4, "12:45")], "15:45") == 4


def test_pick_slot_refuse_de_fusionner_deux_rotations_eloignees():
    # XR 401 vole a 14:10 et 22:15 le 28/07 : deux atterrissages reels.
    assert pick_slot([(5, "14:10")], "22:15") is None


def test_pick_slot_ne_rapproche_pas_par_dessus_minuit():
    # Sans wrap : 00:15 et 20:25 sont a 3 h 50 l'un de l'autre en repassant par
    # minuit, indistinguable d'un retard. La donnee tranche : GQ 560 vole bien
    # deux fois ce jour-la, donc deux creneaux distincts.
    assert pick_slot([(6, "23:50")], "00:20") is None


def test_pick_slot_ignore_les_creneaux_illisibles():
    assert pick_slot([(1, None), (2, "10:00")], "10:20") == 2
