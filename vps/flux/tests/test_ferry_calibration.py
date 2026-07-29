"""Coefficient passagers par traversee, derive des seules sources officielles.

Le coefficient n'est JAMAIS choisi a la main. Il vaut :

    passagers officiels du trimestre (ELSTAT SMA06, table flux_port_quarterly)
    -------------------------------------------------------------------------
    traversees comptees sur le meme trimestre (horaires GTP, flux_ferry_crossings)

C'est l'exact equivalent maritime de la calibration HCAA des vols : pax
officiels divises par mouvements. Un trimestre ne se calibre que sur le meme
trimestre d'une autre annee, jamais sur le trimestre voisin : juillet et
octobre n'ont pas le meme remplissage.

La couverture se compte en JOURS, pas en mois. GTP ne publie d'horaires qu'a
partir du 28/07/2026 : le troisieme trimestre 2026 a bien ses trois mois non
vides, mais il lui manque 27 jours de juillet. Un denominateur ampute de 30 %
donnerait un coefficient gonfle de 30 % sans que rien ne le signale.
"""
from datetime import date, timedelta

from flux.ferry_calibration import port_coefficients

Q3_2025 = date(2025, 7, 1)
JULY_2026 = date(2026, 7, 1)
SOURCE = "https://www.statistics.gr/en/statistics/-/publication/SMA06/2025-Q3"
Q3_DAYS = 92  # juillet 31 + aout 31 + septembre 30


def _pax(quarter=Q3_2025, port="heraklion", direction="disembarked", passengers=920_000):
    return [(quarter, port, direction, passengers, SOURCE)]


def _days(count=Q3_DAYS, start=JULY_2026):
    return [start + timedelta(days=offset) for offset in range(count)]


def _crossings(days=None, per_day=5, port="heraklion", direction="arrival"):
    return {(port, direction, day): per_day for day in (days or _days())}


def test_le_coefficient_est_les_passagers_officiels_par_traversee_du_trimestre():
    # 920 000 passagers officiels pour 92 jours a 5 traversees = 460 traversees.
    rows = port_coefficients(_pax(passengers=920_000), _crossings())
    assert {round(r["coef"]) for r in rows} == {2000}


def test_le_coefficient_ne_varie_pas_a_l_interieur_d_un_trimestre():
    # Le rythme du mois passe par le nombre de traversees, pas par le coefficient.
    crossings = {**_crossings(_days(31), per_day=8),
                 **_crossings(_days(61, date(2026, 8, 1)), per_day=3)}
    rows = port_coefficients(_pax(), crossings)
    assert len({round(r["coef"], 6) for r in rows}) == 1


def test_les_passagers_du_trimestre_sont_repartis_au_prorata_des_traversees():
    rows = port_coefficients(_pax(passengers=920_000), _crossings())
    by_month = {r["month"]: r["pax_official"] for r in rows}
    assert by_month[JULY_2026] == round(920_000 * 31 * 5 / 460)
    assert sum(by_month.values()) == 920_000


def test_un_trimestre_ne_se_calibre_jamais_sur_un_autre_trimestre():
    # Seul Q2 est publie : Q3 reste sans coefficient plutot que d'emprunter
    # le remplissage du printemps.
    assert port_coefficients(_pax(quarter=date(2025, 4, 1)), _crossings()) == []


def test_l_annee_officielle_la_plus_recente_l_emporte():
    pax = _pax(quarter=date(2024, 7, 1), passengers=460_000) + _pax(passengers=920_000)
    rows = port_coefficients(pax, _crossings())
    assert {round(r["coef"]) for r in rows} == {2000}


def test_un_trimestre_ampute_de_ses_premiers_jours_n_est_pas_complet():
    # Le cas reel : GTP ouvre ses horaires le 28/07/2026, il manque 27 jours de
    # juillet. Trois mois non vides, et pourtant un denominateur ampute de 29 %.
    rows = port_coefficients(_pax(), _crossings(_days(65, date(2026, 7, 28))))
    assert all(r["quarter_days_covered"] == 65 for r in rows)
    assert all(r["quarter_days_total"] == Q3_DAYS for r in rows)


def test_un_trimestre_incomplet_ne_produit_aucun_coefficient():
    """Sept jours couverts sur 92 donnaient 14 010 passagers par traversee.

    La vue journaliere refusait deja ce chiffre, mais le laisser en base est un
    piege pour qui lit flux_calibration directement. La ligne existe pour
    montrer l'avancement de la couverture ; le coefficient, lui, reste vide
    tant qu'il n'a pas de sens.
    """
    rows = port_coefficients(_pax(), _crossings(_days(7)))
    assert rows and all(r["coef"] is None for r in rows)
    assert all(r["pax_official"] is None for r in rows)
    assert all(r["movements_official"] > 0 for r in rows)  # le comptage, lui, est reel


def test_un_trimestre_entierement_couvert_est_signale_comme_complet():
    rows = port_coefficients(_pax(), _crossings())
    assert all(r["quarter_days_covered"] == r["quarter_days_total"] for r in rows)


def test_un_jour_sans_traversee_compte_quand_meme_comme_couvert():
    # Souda ou Sitia peuvent n'avoir aucun depart un jour donne : c'est un
    # resultat, pas un trou. L'absorber comme non couvert bloquerait a jamais
    # la calibration de ces deux ports.
    crossings = _crossings()
    crossings[("heraklion", "arrival", date(2026, 8, 15))] = 0
    rows = port_coefficients(_pax(), crossings)
    assert all(r["quarter_days_covered"] == Q3_DAYS for r in rows)


def test_les_embarques_calibrent_les_departs_et_les_debarques_les_arrivees():
    pax = (_pax(direction="disembarked", passengers=920_000)
           + _pax(direction="embarked", passengers=460_000))
    crossings = {**_crossings(direction="arrival"), **_crossings(direction="departure")}
    rows = port_coefficients(pax, crossings)
    assert {(r["direction"], round(r["coef"])) for r in rows} == {
        ("arrival", 2000), ("departure", 1000)}


def test_sans_chiffre_officiel_aucun_coefficient_n_est_produit():
    assert port_coefficients([], _crossings()) == []


def test_la_source_officielle_voyage_avec_le_coefficient():
    rows = port_coefficients(_pax(), _crossings())
    assert all(r["source_url"] == SOURCE for r in rows)
    assert all(r["method"] == "elstat-quarterly" for r in rows)
    assert all(r["scope"] == "port" for r in rows)
