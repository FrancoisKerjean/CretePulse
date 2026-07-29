"""Parsing des horaires ferries GTP (www.gtp.gr/RoutesForm.asp).

Voie retenue le 29/07/2026 apres recon : GTP est le seul agregateur complet
accessible sans compte. Les autres voies testees et ecartees :
  - aisstream.io    : creation de compte requise (owner Kami, TODO date)
  - openseas.gr     : port 443 refuse, SPA HTTP seulement
  - ferries.gtp.gr/Services (JSON) : la cle publique "Demo" ne rend qu'un
    sous-ensemble (2 arrivees/jour a Heraklion, "VESSEL TBA"), pas un comptage.

Les fixtures sont des captures reelles du 29/07/2026 :
  gtp_her_piraeus.html      : HERAKLIO -> PIRAEUS pour le 30/07/2026
  gtp_her_destinations.html : page de desambiguisation, liste des destinations
"""
from datetime import date, datetime, timezone
from pathlib import Path

import pytest

from flux.parsers import (
    FERRY_SLOT_WINDOW_MIN,
    GtpRateLimited,
    athens_day,
    dedupe_ferry_movements,
    ferry_movements,
    parse_gtp_destinations,
    parse_gtp_schedules,
    pick_slot,
)

FIXTURES = Path(__file__).parent / "fixtures"
HERAKLIO_PORT_ID = "1417"
PIRAEUS_PORT_ID = "166"


def _fixture(name):
    return (FIXTURES / name).read_text(encoding="utf-8", errors="replace")


# --- liste des destinations desservies --------------------------------------

def test_les_destinations_sont_extraites_avec_leur_code_a_trois_lettres():
    codes = [d["code"] for d in parse_gtp_destinations(_fixture("gtp_her_destinations.html"))]
    assert "TZE" in codes      # Piraeus
    assert "ATI" in codes      # Santorini
    assert "SIT" in codes      # Sitia, seule liaison intra-cretoise
    assert len(codes) == len(set(codes))


def test_le_port_interroge_n_est_pas_sa_propre_destination():
    destinations = parse_gtp_destinations(_fixture("gtp_her_destinations.html"))
    assert all(d["code"] != "HER" for d in destinations)


# --- horaires ---------------------------------------------------------------

def test_une_traversee_porte_ses_deux_ports_ses_deux_heures_et_sa_compagnie():
    schedules = parse_gtp_schedules(_fixture("gtp_her_piraeus.html"))
    seajets = next(s for s in schedules if s["dep_time"] == "08:00")
    assert seajets["dep_port_id"] == HERAKLIO_PORT_ID
    assert seajets["arr_port_id"] == PIRAEUS_PORT_ID
    assert seajets["arr_time"] == "15:25"
    assert seajets["company_code"] == "IJ"
    assert seajets["company_name"] == "Seajets"
    assert seajets["ship_type"] == "cc"


def test_toutes_les_compagnies_de_la_liaison_sont_comptees():
    # Heraklion -> Piraeus le 30/07/2026 : SeaJets 08:00, Blue Star 09:00,
    # Minoan 09:30, puis Blue Star et Minoan a 21:00. Le comptage vaut ce que
    # vaut ce total : cinq traversees, trois compagnies.
    schedules = parse_gtp_schedules(_fixture("gtp_her_piraeus.html"))
    assert sorted(s["dep_time"] for s in schedules) == [
        "08:00", "09:00", "09:30", "21:00", "21:00"]
    assert {s["company_code"] for s in schedules} == {"IJ", "ST", "ML"}


def test_deux_compagnies_partagent_le_meme_horaire_sans_se_confondre():
    # Blue Star et Minoan quittent Heraklion a 21:00 le meme soir. Sans la
    # compagnie dans la cle, ces deux traversees n'en feraient qu'une et le
    # comptage perdrait un navire entier chaque nuit.
    schedules = parse_gtp_schedules(_fixture("gtp_her_piraeus.html"))
    at_nine = [s for s in schedules if s["dep_time"] == "21:00"]
    assert {s["company_code"] for s in at_nine} == {"ST", "ML"}
    assert len({s["sched_id"] for s in at_nine}) == 2


def test_l_identifiant_de_ligne_gtp_ne_distingue_pas_les_traversees():
    # route_id 778 porte trois traversees distinctes du 30/07 : s'en servir
    # comme cle ecraserait deux navires sur trois.
    schedules = parse_gtp_schedules(_fixture("gtp_her_piraeus.html"))
    assert sum(1 for s in schedules if s["route_id"] == "778") == 3


def test_une_traversee_de_nuit_arrive_le_lendemain():
    schedules = parse_gtp_schedules(_fixture("gtp_her_piraeus.html"))
    overnight = next(s for s in schedules if s["dep_time"] == "21:00")
    assert overnight["plus_days"] == 1


def test_une_traversee_de_jour_arrive_le_jour_meme():
    schedules = parse_gtp_schedules(_fixture("gtp_her_piraeus.html"))
    assert next(s for s in schedules if s["dep_time"] == "08:00")["plus_days"] == 0


def test_les_identifiants_gtp_sont_conserves_pour_audit():
    # route_id et sched_id ne servent PAS de cle : ils bougeraient si GTP
    # republie un horaire. Ils restent lisibles pour reconcilier a la main.
    schedules = parse_gtp_schedules(_fixture("gtp_her_piraeus.html"))
    seajets = next(s for s in schedules if s["dep_time"] == "08:00")
    assert seajets["route_id"] == "4859"
    assert seajets["sched_id"] == "63938001"


def test_une_page_sans_resultat_ne_rend_aucune_traversee():
    assert parse_gtp_schedules(_fixture("gtp_her_destinations.html")) == []


# --- refus de service : le piege qui vide un jeu de donnees en silence -------

def test_un_refus_de_service_de_gtp_leve_au_lieu_de_rendre_une_liste_vide():
    """GTP repond 200 avec « You have exceeded the website's maximum request
    limit » et aucune table d'horaires. Rendre [] ferait passer un refus pour
    une journee sans traversee : Heraklion a ete ecrit a 4 traversees le
    31/07/2026 alors qu'il en compte 11, sans une ligne d'erreur nulle part.
    """
    with pytest.raises(GtpRateLimited):
        parse_gtp_schedules(_fixture("gtp_rate_limited.html"))


def test_un_refus_de_service_leve_aussi_sur_la_liste_des_destinations():
    # Sans cela, un refus viderait la liste des liaisons et le port entier
    # tomberait a zero traversee pour la journee.
    with pytest.raises(GtpRateLimited):
        parse_gtp_destinations(_fixture("gtp_rate_limited.html"))


def test_une_page_normale_ne_declenche_pas_la_detection_de_refus():
    assert parse_gtp_schedules(_fixture("gtp_her_piraeus.html"))
    assert parse_gtp_destinations(_fixture("gtp_her_destinations.html"))


# --- ancrage sur le port cretois --------------------------------------------

def test_un_depart_est_date_et_horodate_au_port_cretois():
    schedules = parse_gtp_schedules(_fixture("gtp_her_piraeus.html"))
    rows = ferry_movements(schedules, HERAKLIO_PORT_ID, date(2026, 7, 30))
    overnight = next(r for r in rows if r["sched_slot"] == "21:00")
    assert overnight["direction"] == "departure"
    assert overnight["service_date"] == date(2026, 7, 30)
    assert overnight["counterpart_port_id"] == PIRAEUS_PORT_ID


def test_une_arrivee_de_nuit_compte_pour_le_jour_ou_le_navire_accoste():
    # Meme traversee lue depuis l'autre bout : partie le 30 a 21:00, elle
    # accoste le 31. La dater au 30 gonflerait la veille et viderait le lendemain.
    schedules = parse_gtp_schedules(_fixture("gtp_her_piraeus.html"))
    rows = ferry_movements(schedules, PIRAEUS_PORT_ID, date(2026, 7, 30))
    overnight = next(r for r in rows if r["counterpart_port_id"] == HERAKLIO_PORT_ID
                     and r["sched_slot"] == "06:15")
    assert overnight["direction"] == "arrival"
    assert overnight["service_date"] == date(2026, 7, 31)


def test_une_traversee_etrangere_au_port_interroge_est_ignoree():
    schedules = parse_gtp_schedules(_fixture("gtp_her_piraeus.html"))
    assert ferry_movements(schedules, "999999", date(2026, 7, 30)) == []


# --- un navire, une escale, meme s'il dessert dix ports ---------------------

def _seajets_legs():
    """Le SeaJets de 08:00 du 30/07/2026, tel que GTP le rend port par port.

    Une interrogation GTP porte sur UN couple origine-destination. Le meme
    navire quittant Heraklion a 08:00 pour Santorin (09:35), Naxos (11:00),
    Mykonos (12:20) puis le Piree (15:25) apparait donc dans quatre pages. Le
    compter quatre fois quadruplerait les entrees maritimes de la journee.
    """
    common = {"direction": "departure", "service_date": date(2026, 7, 30),
              "sched_slot": "08:00", "company_code": "IJ", "company_name": "Seajets",
              "ship_type": "cc", "route_id": "4859", "sched_id": "63938001"}
    return [
        {**common, "counterpart_port_id": "11808", "counterpart_port_name": "SANTORINI",
         "duration_min": 95},
        {**common, "counterpart_port_id": "11978", "counterpart_port_name": "NAXOS",
         "duration_min": 180},
        {**common, "counterpart_port_id": "12183", "counterpart_port_name": "MYKONOS",
         "duration_min": 260},
        {**common, "counterpart_port_id": "166", "counterpart_port_name": "PIRAEUS",
         "duration_min": 445},
    ]


def test_un_navire_desservant_plusieurs_ports_reste_un_seul_mouvement():
    assert len(dedupe_ferry_movements(_seajets_legs())) == 1


def test_le_mouvement_retenu_porte_le_terminus_de_la_ligne():
    # Entre les quatre escales, celle qui dure le plus longtemps est le bout de
    # la ligne : c'est elle qui decrit le navire, pas la premiere rencontree.
    movement = dedupe_ferry_movements(_seajets_legs())[0]
    assert movement["counterpart_port_name"] == "PIRAEUS"


def test_le_nombre_d_escales_regroupees_reste_lisible():
    # Sans ce compteur, le regroupement serait invisible et un jour ou GTP
    # cesserait de publier les escales intermediaires passerait inapercu.
    assert dedupe_ferry_movements(_seajets_legs())[0]["legs_seen"] == 4


def test_deux_compagnies_au_meme_horaire_ne_sont_pas_regroupees():
    blue_star, minoan = _seajets_legs()[0], dict(_seajets_legs()[0], company_code="ML")
    assert len(dedupe_ferry_movements([blue_star, minoan])) == 2


def test_une_traversee_porte_sa_duree_pour_pouvoir_etre_regroupee():
    schedules = parse_gtp_schedules(_fixture("gtp_her_piraeus.html"))
    rows = ferry_movements(schedules, HERAKLIO_PORT_ID, date(2026, 7, 30))
    day_run = next(r for r in rows if r["sched_slot"] == "08:00")
    overnight = next(r for r in rows if r["sched_slot"] == "21:00")
    assert day_run["duration_min"] == 445           # 08:00 -> 15:25
    assert overnight["duration_min"] == 9 * 60 + 15  # 21:00 -> 06:15 le lendemain


# --- journee de service ancree sur Athenes ----------------------------------

def test_un_cron_du_soir_en_utc_interroge_deja_le_lendemain_a_athenes():
    # Les crons du VPS tournent en UTC. A 22:10 UTC il est 01:10 a Athenes :
    # demander "aujourd'hui" en UTC daterait la capture de la veille.
    assert athens_day(datetime(2026, 7, 30, 22, 10, tzinfo=timezone.utc)) == date(2026, 7, 31)


def test_un_cron_du_matin_en_utc_reste_sur_la_journee_en_cours():
    assert athens_day(datetime(2026, 7, 30, 3, 10, tzinfo=timezone.utc)) == date(2026, 7, 30)


# --- reconciliation d'un horaire republie -----------------------------------

def test_un_horaire_republie_met_a_jour_la_traversee_au_lieu_d_en_creer_une():
    # Meme defaut que sur les vols : sans rapprochement, un 21:00 devenu 21:30
    # inserait une deuxieme traversee et doublait le comptage de la nuit.
    assert pick_slot([(7, "21:00")], "21:30", FERRY_SLOT_WINDOW_MIN) == 7


def test_deux_rotations_du_jour_restent_deux_traversees():
    # Blue Star quitte Heraklion a 09:00 puis a 21:00 le meme jour : deux
    # navires, deux lignes. Les rapprocher en effacerait un.
    assert pick_slot([(7, "09:00")], "21:00", FERRY_SLOT_WINDOW_MIN) is None
