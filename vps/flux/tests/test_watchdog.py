"""Sonde de collecte : detecter le prochain trou sans qu'un humain le voie.

Le capteur HER n'a rien ecrit du 22 au 27/07/2026 pendant que le cron tournait
144 fois par jour. Rien ne l'a signale : log sans horodatage, aucun journal de
run, code de sortie avale par cron.

Le 02/08/2026 la sonde a fait son travail (elle criait depuis 4 jours) mais son
message, lui, mentait : titre « Capteurs vols » pour six capteurs de PORT, et
pas un mot de la cause alors qu'elle etait en base. On repare le message.
"""
from datetime import datetime, timedelta, timezone

from flux.watchdog import evaluate, merge_errors, muted_feeds

NOW = datetime(2026, 7, 29, 12, 0, tzinfo=timezone.utc)
FLIGHTS = "flight_arrivals"
FRESH = {k: NOW - timedelta(minutes=8) for k in
         ((FLIGHTS, "HER", "arrival"), (FLIGHTS, "HER", "departure"),
          (FLIGHTS, "CHQ", "arrival"), (FLIGHTS, "CHQ", "departure"))}
SANE = {(FLIGHTS, "HER", "arrival"): 167, (FLIGHTS, "HER", "departure"): 163,
        (FLIGHTS, "CHQ", "arrival"): 66, (FLIGHTS, "CHQ", "departure"): 65}

# Capteur ferries ABANDONNE le 16/08/2026 (arbitrage Francois, cf watchdog.py).
# La constante reste : `merge_errors` traite encore des cles ferries, et les deux
# tests qui la couvrent gardent leur exemple historique. Mais FRESH et SANE ne
# portent plus de ferries : y laisser des capteurs qu on ne surveille plus ferait
# croire le contraire a la prochaine lecture.
FERRIES = "ferry_crossings"


def test_tout_va_bien_aucune_alerte():
    assert evaluate(FRESH, SANE, NOW) == []


def test_capteur_muet_declenche_une_alerte():
    stale = {**FRESH, (FLIGHTS, "HER", "arrival"): NOW - timedelta(hours=5)}
    alerts = evaluate(stale, SANE, NOW)
    assert len(alerts) == 1
    assert "HER (aéroport)" in alerts[0]
    assert "5" in alerts[0]  # l'anciennete est dans le message


def test_capteur_jamais_vu_declenche_une_alerte():
    never = {**FRESH, (FLIGHTS, "HER", "arrival"): None}
    alerts = evaluate(never, SANE, NOW)
    assert len(alerts) == 1
    assert "HER (aéroport)" in alerts[0]


def test_retard_court_tolere():
    # Le cron tourne toutes les 10 min : 25 min de retard = un aleas reseau.
    ok = {**FRESH, (FLIGHTS, "CHQ", "arrival"): NOW - timedelta(minutes=25)}
    assert evaluate(ok, SANE, NOW) == []


def test_compte_journalier_gonfle_declenche_une_alerte():
    # 776 arrivees HER le 16/07 : la signature du bug de doublons.
    inflated = {**SANE, (FLIGHTS, "HER", "arrival"): 776}
    alerts = evaluate(FRESH, inflated, NOW)
    assert len(alerts) == 1
    assert "776" in alerts[0]


def test_compte_journalier_effondre_declenche_une_alerte():
    collapsed = {**SANE, (FLIGHTS, "HER", "departure"): 20}
    alerts = evaluate(FRESH, collapsed, NOW)
    assert len(alerts) == 1
    assert "20" in alerts[0]


def test_journee_absente_declenche_une_alerte():
    # Le cas du trou 19->26/07 : la journee de service n'existe simplement pas.
    missing = {k: v for k, v in SANE.items() if k != (FLIGHTS, "HER", "arrival")}
    alerts = evaluate(FRESH, missing, NOW)
    assert len(alerts) == 1
    assert "HER (aéroport)" in alerts[0]


def test_le_port_et_l_aeroport_d_heraklion_sont_deux_capteurs_distincts():
    # HER designe un aeroport ET un port. Sans le collecteur dans la cle, la
    # fraicheur des ferries masquerait un capteur vols muet, et inversement.
    counts = {**SANE, (FLIGHTS, "HER", "arrival"): 776}
    alerts = evaluate(FRESH, counts, NOW)
    assert len(alerts) == 1
    assert "776" in alerts[0]


def test_le_libelle_dit_la_NATURE_du_capteur_en_panne():
    # Le 02/08/2026, six capteurs de PORT muets ont ete annonces « HER arrival,
    # SOU arrival, SIT arrival... » sous le titre « Capteurs vols ». Rien dans
    # le message ne permettait de savoir qu'il s'agissait des ferries.
    # Les ferries sont partis le 16/08, la lecon reste : un libelle qui ne
    # nomme pas la nature du capteur laisse lire n'importe quoi.
    stale = {**FRESH, (FLIGHTS, "HER", "arrival"): NOW - timedelta(hours=5)}
    alerts = evaluate(stale, SANE, NOW)
    assert len(alerts) == 1
    assert "HER (aéroport)" in alerts[0]


def test_la_cause_de_la_panne_est_dans_l_alerte():
    # « muet depuis 96 h » repete 96 fois ne dit pas pourquoi, alors que la
    # cause est ecrite dans flux_collector_runs.error a chaque run rate.
    stale = {**FRESH, (FLIGHTS, "HER", "arrival"): NOW - timedelta(hours=5)}
    errors = {(FLIGHTS, "HER", "arrival"):
              (NOW - timedelta(hours=2), "source injoignable : Max retries exceeded")}
    alerts = evaluate(stale, SANE, NOW, last_error=errors)
    assert len(alerts) == 1
    assert "source injoignable" in alerts[0]


def test_une_vieille_erreur_ne_pollue_pas_une_panne_recente():
    # Une erreur anterieure au dernier succes est deja reparee : l'afficher
    # ferait accuser la mauvaise cause.
    stale = {**FRESH, (FLIGHTS, "CHQ", "arrival"): NOW - timedelta(hours=5)}
    errors = {(FLIGHTS, "CHQ", "arrival"):
              (NOW - timedelta(days=9), "panne d'hier, corrigee depuis")}
    alerts = evaluate(stale, SANE, NOW, last_error=errors)
    assert len(alerts) == 1
    assert "panne d'hier" not in alerts[0]


def test_la_cause_est_tronquee_pour_rester_lisible():
    # Les traces requests font 400 caracteres : illisible sur un telephone.
    stale = {**FRESH, (FLIGHTS, "HER", "arrival"): NOW - timedelta(hours=5)}
    errors = {(FLIGHTS, "HER", "arrival"): (NOW - timedelta(hours=2), "X" * 400)}
    alerts = evaluate(stale, SANE, NOW, last_error=errors)
    assert len(alerts[0]) < 250


# Les deux tests de bande sur les ferries (comptage effondre a 0, gonfle a 60)
# ont ete retires avec le capteur le 16/08/2026 : la mecanique de bande reste
# couverte par `test_compte_journalier_gonfle` et `_effondre` sur les vols.


def test_une_panne_de_port_vaut_pour_ses_deux_sens():
    # Le collecteur ferries journalise son echec au niveau du PORT : GTP tombe
    # avant qu'on sache de quel sens il s'agit, donc direction est NULL. Sans
    # propagation, la cause reste invisible sur les deux capteurs du port.
    rows = [("ferry_crossings", "HER", None, NOW, "GTP injoignable")]
    errors = merge_errors(rows)
    assert errors[("ferry_crossings", "HER", "arrival")] == (NOW, "GTP injoignable")
    assert errors[("ferry_crossings", "HER", "departure")] == (NOW, "GTP injoignable")


def test_une_erreur_de_sens_precis_prime_sur_celle_du_noeud():
    older = NOW - timedelta(hours=3)
    rows = [("ferry_crossings", "HER", None, older, "panne generale"),
            ("ferry_crossings", "HER", "arrival", NOW, "parseur casse a l'arrivee")]
    errors = merge_errors(rows)
    assert errors[("ferry_crossings", "HER", "arrival")][1] == "parseur casse a l'arrivee"
    assert errors[("ferry_crossings", "HER", "departure")][1] == "panne generale"


def test_un_capteur_en_sourdine_ne_reveille_personne():
    # Une panne reelle, connue, que rien ne peut reparer cote code : 24 alertes
    # par jour n'apprennent plus rien. C'est le cas GTP du 30/07, et le prochain.
    mute = {(FLIGHTS, "HER", "arrival"): NOW.date() + timedelta(days=14)}
    stale = {**FRESH, (FLIGHTS, "HER", "arrival"): NOW - timedelta(hours=96)}
    assert evaluate(stale, SANE, NOW, muted_until=mute) == []


def test_la_sourdine_expire_toute_seule():
    # Une sonde qu'on eteint « en attendant » est une sonde morte : c'est ce
    # silence-la qui a coute cinq jours de collecte HER en juillet.
    mute = {(FLIGHTS, "HER", "arrival"): NOW.date() - timedelta(days=1)}
    stale = {**FRESH, (FLIGHTS, "HER", "arrival"): NOW - timedelta(hours=96)}
    alerts = evaluate(stale, SANE, NOW, muted_until=mute)
    assert len(alerts) == 1
    assert "HER (aéroport)" in alerts[0]


def test_la_sourdine_ne_couvre_que_le_capteur_vise():
    mute = {(FLIGHTS, "HER", "arrival"): NOW.date() + timedelta(days=14)}
    stale = {**FRESH,
             (FLIGHTS, "HER", "arrival"): NOW - timedelta(hours=96),
             (FLIGHTS, "CHQ", "arrival"): NOW - timedelta(hours=5)}
    alerts = evaluate(stale, SANE, NOW, muted_until=mute)
    assert len(alerts) == 1
    assert "CHQ (aéroport)" in alerts[0]


def test_les_capteurs_en_sourdine_restent_visibles_dans_le_journal():
    # Une sourdine invisible est un trou : le run doit dire ce qu'il tait et
    # jusqu'a quand, meme quand il n'envoie rien.
    mute = {(FLIGHTS, "HER", "arrival"): NOW.date() + timedelta(days=14)}
    lignes = muted_feeds(mute, NOW)
    assert len(lignes) == 1
    assert "HER (aéroport) arrivées" in lignes[0]
    assert "12/08" in lignes[0]


def test_une_sourdine_expiree_ne_figure_plus_au_journal():
    mute = {(FLIGHTS, "HER", "arrival"): NOW.date() - timedelta(days=1)}
    assert muted_feeds(mute, NOW) == []


def test_plusieurs_pannes_plusieurs_alertes():
    stale = {**FRESH, (FLIGHTS, "HER", "arrival"): None, (FLIGHTS, "HER", "departure"): None}
    assert len(evaluate(stale, SANE, NOW)) == 2


def test_le_capteur_ferries_est_sorti_du_perimetre_surveille():
    """Arbitrage Francois du 16/08/2026 : le capteur ferries est abandonne.

    Mesure qui a porte la decision : GTP a LU le mail du 02/08 (statut Resend
    `ok lu`) et n a pas repondu en 13 jours, le DROP sur l IPv4 du VPS tient a
    17 jours (timeout depuis le VPS, 200 en 0,62 s depuis Brest a la meme
    minute), et les ferries pesent 14,0 % des arrivees (ELSTAT T3 2025 :
    570 235 debarquements contre 3 487 622 arrivees aeriennes).

    Surveiller un capteur qu on a decide de ne plus collecter produirait 24
    alertes par jour sur une panne qu on ne repare pas. On ne met pas en
    sourdine : une sourdine est une promesse de reprise, et il n y en a plus.
    """
    from flux.watchdog import FEEDS

    assert [f for f in FEEDS if f["collector"] == "ferry_crossings"] == []
    assert len([f for f in FEEDS if f["collector"] == "flight_arrivals"]) == 4


def test_la_mecanique_de_sourdine_survit_au_retrait_des_ferries():
    """Elle resservira au prochain capteur en panne durable : ne pas la jeter."""
    mute = {(FLIGHTS, "HER", "arrival"): NOW.date() + timedelta(days=14)}
    lignes = muted_feeds(mute, NOW)
    assert len(lignes) == 1
    assert "HER (aéroport) arrivées" in lignes[0]
