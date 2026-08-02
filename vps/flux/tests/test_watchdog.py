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

FERRIES = "ferry_crossings"
# Releve reel GTP du 30/07/2026 : Heraklion 9 mouvements, Souda 2, Sitia 2.
FRESH.update({(FERRIES, port, direction): NOW - timedelta(hours=6)
              for port in ("HER", "SOU", "SIT")
              for direction in ("arrival", "departure")})
SANE.update({(FERRIES, port, direction): count
             for port, count in (("HER", 5), ("SOU", 1), ("SIT", 1))
             for direction in ("arrival", "departure")})


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


def test_le_libelle_dit_lequel_des_deux_HER_est_en_panne():
    # Le 02/08/2026, six capteurs de PORT muets ont ete annonces « HER arrival,
    # SOU arrival, SIT arrival... » sous le titre « Capteurs vols ». Rien dans
    # le message ne permettait de savoir qu'il s'agissait des ferries. La cle
    # distingue les deux capteurs depuis le premier jour ; le libelle, non.
    stale = {**FRESH,
             (FLIGHTS, "HER", "arrival"): NOW - timedelta(hours=5),
             (FERRIES, "HER", "arrival"): NOW - timedelta(hours=40)}
    alerts = evaluate(stale, SANE, NOW)
    assert len(alerts) == 2
    aeroport = [a for a in alerts if "HER (aéroport)" in a]
    port = [a for a in alerts if "HER (port)" in a]
    assert len(aeroport) == 1 and len(port) == 1
    assert aeroport[0] != port[0]


def test_la_cause_de_la_panne_est_dans_l_alerte():
    # « muet depuis 96 h » repete 96 fois ne dit pas pourquoi, alors que la
    # cause est ecrite dans flux_collector_runs.error a chaque run rate.
    stale = {**FRESH, (FERRIES, "HER", "arrival"): NOW - timedelta(hours=40)}
    errors = {(FERRIES, "HER", "arrival"):
              (NOW - timedelta(hours=2), "GTP injoignable (HER->) : Max retries exceeded")}
    alerts = evaluate(stale, SANE, NOW, last_error=errors)
    assert len(alerts) == 1
    assert "GTP injoignable" in alerts[0]


def test_une_vieille_erreur_ne_pollue_pas_une_panne_recente():
    # Une erreur anterieure au dernier succes est deja reparee : l'afficher
    # ferait accuser la mauvaise cause.
    stale = {**FRESH, (FERRIES, "SOU", "arrival"): NOW - timedelta(hours=40)}
    errors = {(FERRIES, "SOU", "arrival"):
              (NOW - timedelta(days=9), "panne d'hier, corrigee depuis")}
    alerts = evaluate(stale, SANE, NOW, last_error=errors)
    assert len(alerts) == 1
    assert "panne d'hier" not in alerts[0]


def test_la_cause_est_tronquee_pour_rester_lisible():
    # Les traces requests font 400 caracteres : illisible sur un telephone.
    stale = {**FRESH, (FERRIES, "HER", "arrival"): NOW - timedelta(hours=40)}
    errors = {(FERRIES, "HER", "arrival"): (NOW - timedelta(hours=2), "X" * 400)}
    alerts = evaluate(stale, SANE, NOW, last_error=errors)
    assert len(alerts[0]) < 250


def test_comptage_ferries_effondre_declenche_une_alerte():
    # Zero traversee a Heraklion en plein aout : GTP a change de forme ou le
    # parseur ne matche plus. C'est exactement le trou qu'on veut voir.
    collapsed = {**SANE, (FERRIES, "HER", "arrival"): 0}
    alerts = evaluate(FRESH, collapsed, NOW)
    assert len(alerts) == 1
    assert "traversées" in alerts[0]


def test_comptage_ferries_gonfle_declenche_une_alerte():
    # 60 traversees a Heraklion : la signature du regroupement d'escales qui
    # aurait lache (un navire compte une fois par port desservi).
    inflated = {**SANE, (FERRIES, "HER", "departure"): 60}
    alerts = evaluate(FRESH, inflated, NOW)
    assert len(alerts) == 1
    assert "60" in alerts[0]


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
    # GTP a banni l'IP du VPS le 30/07 : la panne est reelle, connue, et rien
    # ne peut la reparer cote code. 24 alertes par jour n'apprennent plus rien.
    mute = {(FERRIES, "HER", "arrival"): NOW.date() + timedelta(days=14)}
    stale = {**FRESH, (FERRIES, "HER", "arrival"): NOW - timedelta(hours=96)}
    assert evaluate(stale, SANE, NOW, muted_until=mute) == []


def test_la_sourdine_expire_toute_seule():
    # Une sonde qu'on eteint « en attendant » est une sonde morte : c'est ce
    # silence-la qui a coute cinq jours de collecte HER en juillet.
    mute = {(FERRIES, "HER", "arrival"): NOW.date() - timedelta(days=1)}
    stale = {**FRESH, (FERRIES, "HER", "arrival"): NOW - timedelta(hours=96)}
    alerts = evaluate(stale, SANE, NOW, muted_until=mute)
    assert len(alerts) == 1
    assert "HER (port)" in alerts[0]


def test_la_sourdine_ne_couvre_que_le_capteur_vise():
    mute = {(FERRIES, "HER", "arrival"): NOW.date() + timedelta(days=14)}
    stale = {**FRESH,
             (FERRIES, "HER", "arrival"): NOW - timedelta(hours=96),
             (FLIGHTS, "CHQ", "arrival"): NOW - timedelta(hours=5)}
    alerts = evaluate(stale, SANE, NOW, muted_until=mute)
    assert len(alerts) == 1
    assert "CHQ (aéroport)" in alerts[0]


def test_les_capteurs_en_sourdine_restent_visibles_dans_le_journal():
    # Une sourdine invisible est un trou : le run doit dire ce qu'il tait et
    # jusqu'a quand, meme quand il n'envoie rien.
    mute = {(FERRIES, "HER", "arrival"): NOW.date() + timedelta(days=14)}
    lignes = muted_feeds(mute, NOW)
    assert len(lignes) == 1
    assert "HER (port) arrivées" in lignes[0]
    assert "12/08" in lignes[0]


def test_une_sourdine_expiree_ne_figure_plus_au_journal():
    mute = {(FERRIES, "HER", "arrival"): NOW.date() - timedelta(days=1)}
    assert muted_feeds(mute, NOW) == []


def test_plusieurs_pannes_plusieurs_alertes():
    stale = {**FRESH, (FLIGHTS, "HER", "arrival"): None, (FLIGHTS, "HER", "departure"): None}
    assert len(evaluate(stale, SANE, NOW)) == 2
