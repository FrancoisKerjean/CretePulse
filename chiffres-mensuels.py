#!/usr/bin/env python3
"""
crete.direct — « La Crète en chiffres », relevé mensuel (plan saison 2027, point 4).

Un seul format, reproduit chaque mois, 4 locales (en/fr/de/el), publié sur /articles
comme un guide `long` de catégorie `data`. Zéro LLM : chaque phrase est un gabarit,
chaque nombre vient d'une table de la base et porte sa source dans la page.

Sources lues (toutes déjà en base, aucune collecte ici) :
  hcaa_crete_monthly        HCAA (ypa.gr), passagers mensuels HER/CHQ/JSH, ~1 mois de délai
  flux_flight_arrivals      tableaux d'arrivées/départs HER + CHQ lus par crete.direct
  flux_cruise_calls         programme du port d'Héraklion (PDF)
  airbnb_snapshots/listings Inside Airbnb, région crete
  flux_economy_annual       Banque de Grèce, enquête frontières (visites, recettes, séjour)
  bus_stops                 arrêts urbains avec passages en direct (api_code citybus)

Usage (sur le VPS, comme hcaa-crete-airports.py) :
  python3 chiffres-mensuels.py --month 2026-10 --preview /tmp/chiffres   # JSON + 4 HTML, rien en base
  python3 chiffres-mensuels.py --month 2026-10 --commit                  # insère/MAJ le guide publié
Depuis le poste, sans base :
  python3 chiffres-mensuels.py --from-json data.json --preview out/
"""

import argparse
import json
import os
import sys
from datetime import date, datetime, timedelta, timezone

LOCALES = ["en", "fr", "de", "el"]
HOST = "crete.direct"
SOURCE_HCAA = "https://www.ypa.gr/profile/statistics/"
SOURCE_PORT = "https://www.portheraklion.gr/"
SOURCE_AIRBNB = "https://insideairbnb.com/get-the-data/"
SOURCE_BOG = "https://www.bankofgreece.gr/en/statistics/external-sector/balance-of-payments/travel-services"
SOURCE_BUS = f"https://{HOST}/en/live"

MONTHS = {
    "en": ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    "fr": ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"],
    "de": ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"],
    "el": ["Ιανουάριος", "Φεβρουάριος", "Μάρτιος", "Απρίλιος", "Μάιος", "Ιούνιος", "Ιούλιος", "Αύγουστος", "Σεπτέμβριος", "Οκτώβριος", "Νοέμβριος", "Δεκέμβριος"],
}
# Génitif grec pour « 1 au 26 octobre » et « septembre 2026 » dans une phrase.
MONTHS_EL_ACC = ["Ιανουάριο", "Φεβρουάριο", "Μάρτιο", "Απρίλιο", "Μάιο", "Ιούνιο", "Ιούλιο", "Αύγουστο", "Σεπτέμβριο", "Οκτώβριο", "Νοέμβριο", "Δεκέμβριο"]
MONTHS_EL_GEN = ["Ιανουαρίου", "Φεβρουαρίου", "Μαρτίου", "Απριλίου", "Μαΐου", "Ιουνίου", "Ιουλίου", "Αυγούστου", "Σεπτεμβρίου", "Οκτωβρίου", "Νοεμβρίου", "Δεκεμβρίου"]

AIRPORTS = {"HER": {"en": "Heraklion", "fr": "Héraklion", "de": "Heraklion", "el": "Ηράκλειο"},
            "CHQ": {"en": "Chania", "fr": "La Canée (Chania)", "de": "Chania", "el": "Χανιά"},
            "JSH": {"en": "Sitia", "fr": "Sitia", "de": "Sitia", "el": "Σητεία"}}

CITIES = {"en": {"Athens": "Athens", "Munich": "Munich", "Dusseldorf": "Düsseldorf", "Thessaloniki": "Thessaloniki", "Zurich": "Zurich", "Cologne": "Cologne", "Frankfurt": "Frankfurt", "Hamburg": "Hamburg", "Vienna": "Vienna", "Milan": "Milan", "Brussels": "Brussels", "Warsaw": "Warsaw"},
          "fr": {"Athens": "Athènes", "Munich": "Munich", "Dusseldorf": "Düsseldorf", "Thessaloniki": "Thessalonique", "Zurich": "Zurich", "Cologne": "Cologne", "Frankfurt": "Francfort", "Hamburg": "Hambourg", "Vienna": "Vienne", "Milan": "Milan", "Brussels": "Bruxelles", "Warsaw": "Varsovie", "London Gatwick": "Londres Gatwick", "London Heathrow": "Londres Heathrow", "London Stansted": "Londres Stansted", "London Luton": "Londres Luton"},
          "de": {"Athens": "Athen", "Munich": "München", "Dusseldorf": "Düsseldorf", "Thessaloniki": "Thessaloniki", "Zurich": "Zürich", "Cologne": "Köln", "Frankfurt": "Frankfurt", "Hamburg": "Hamburg", "Vienna": "Wien", "Milan": "Mailand", "Brussels": "Brüssel", "Warsaw": "Warschau"},
          "el": {"Athens": "Αθήνα", "Munich": "Μόναχο", "Dusseldorf": "Ντίσελντορφ", "Thessaloniki": "Θεσσαλονίκη", "Zurich": "Ζυρίχη", "Cologne": "Κολωνία", "Frankfurt": "Φρανκφούρτη", "Hamburg": "Αμβούργο", "Vienna": "Βιέννη", "Milan": "Μιλάνο", "Brussels": "Βρυξέλλες", "Warsaw": "Βαρσοβία", "Berlin": "Βερολίνο", "Tel Aviv": "Τελ Αβίβ", "Manchester": "Μάντσεστερ", "London Gatwick": "Λονδίνο Gatwick", "Paris": "Παρίσι", "Amsterdam": "Άμστερνταμ", "Stuttgart": "Στουτγκάρδη"}}

# Unités régionales Inside Airbnb (noms grecs de la colonne neighbourhood) en latin.
NEIGHBOURHOODS = {"Χανίων": "Chania", "Ρεθύμνης": "Rethymno", "Χερσονήσου": "Hersonissos", "Ηρακλείου": "Heraklion",
                  "Αποκορώνου": "Apokoronas", "Αγίου Νικολάου": "Agios Nikolaos", "Κισσάμου": "Kissamos", "Πλατανιά": "Platanias",
                  "Μαλεβιζίου": "Malevizi", "Σητείας": "Sitia", "Ιεράπετρας": "Ierapetra", "Φαιστού": "Phaistos",
                  "Αγίου Βασιλείου": "Agios Vasileios", "Μυλοποτάμου": "Mylopotamos", "Σφακίων": "Sfakia",
                  "Καντάνου - Σελίνου": "Kantanos-Selino", "Γόρτυνας": "Gortyna", "Βιάννου": "Viannos",
                  "Αρχανών - Αστερουσίων": "Archanes-Asterousia", "Μινώα Πεδιάδας": "Minoa Pediada", "Ανωγείων": "Anogeia",
                  "Αμαρίου": "Amari", "Οροπεδίου Λασιθίου": "Lasithi Plateau", "Γαύδου": "Gavdos"}


# ---------------------------------------------------------------- formatage

def fmt_int(n, locale):
    if n is None:
        return "–"
    s = f"{int(round(n)):,}"
    if locale == "en":
        return s
    if locale == "fr":
        return s.replace(",", " ")
    return s.replace(",", ".")


def fmt_pct(x, locale, signed=True):
    if x is None:
        return "–"
    sign = "" if not signed else ("+" if x > 0 else ("−" if x < 0 else ""))
    s = f"{abs(x):.1f}"
    if locale != "en":
        s = s.replace(".", ",")
        return f"{sign}{s} %"
    return f"{sign}{s}%"


def fmt_dec(x, locale, nd=1):
    if x is None:
        return "–"
    s = f"{x:.{nd}f}"
    return s if locale == "en" else s.replace(".", ",")


def fmt_eur(x, locale, nd=0):
    s = fmt_int(x, locale) if nd == 0 else fmt_dec(x, locale, nd)
    return f"€{s}" if locale == "en" else f"{s} €"


def pct_change(new, old):
    if not old or new is None:
        return None
    return (new - old) / old * 100.0


def month_name(locale, m, genitive=False):
    if locale == "el" and genitive:
        return MONTHS_EL_GEN[m - 1]
    return MONTHS[locale][m - 1]


def month_label(locale, y, m, case="gen"):
    """fr/de : nom du mois ; el : génitif par défaut (« Σεπτεμβρίου 2026 »), nom/acc sur demande."""
    if locale == "el":
        names = {"gen": MONTHS_EL_GEN, "acc": MONTHS_EL_ACC, "nom": MONTHS["el"]}[case]
        return f"{names[m - 1]} {y}"
    return f"{MONTHS[locale][m - 1]} {y}"


def de_month(locale, label):
    """fr : « d'octobre 2026 » / « de septembre 2026 » ; autres locales : le libellé tel quel."""
    if locale != "fr":
        return label
    return ("d'" if label[0].lower() in "aeiouyàâéèêîôûœ" else "de ") + label


def city(locale, name):
    return CITIES.get(locale, {}).get(name, name)


def esc(s):
    return str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def table(headers, rows):
    th = "".join(f"<th>{esc(h)}</th>" for h in headers)
    body = "".join("<tr>" + "".join(f"<td>{esc(c)}</td>" for c in r) + "</tr>" for r in rows)
    return f"<table><thead><tr>{th}</tr></thead><tbody>{body}</tbody></table>"


def source_line(locale, label, url, detail):
    word = {"en": "Source", "fr": "Source", "de": "Quelle", "el": "Πηγή"}[locale]
    sep = " : " if locale == "fr" else ": "
    return (f'<p class="source-attribution"><em>{word}{sep}<a href="{url}" rel="noopener" target="_blank">{esc(label)}</a>'
            f"{', ' + esc(detail) if detail else ''}.</em></p>")


# ---------------------------------------------------------------- collecte

def _one(cur, sql, params=()):
    cur.execute(sql, params)
    r = cur.fetchone()
    return r


def collect(conn, year, month, today=None):
    """Lit la base et renvoie un dict JSON-sérialisable. Aucune écriture."""
    today = today or datetime.now(timezone.utc).date()
    first = date(year, month, 1)
    nxt = (first.replace(day=28) + timedelta(days=4)).replace(day=1)
    prev_first = (first - timedelta(days=1)).replace(day=1)
    # Dernier jour complet du mois relevé : hier au plus tard.
    last_complete = min(nxt - timedelta(days=1), today - timedelta(days=1))
    span_days = (last_complete - first).days + 1
    prev_last = prev_first + timedelta(days=span_days - 1)
    d = {"year": year, "month": month, "generated_on": today.isoformat(),
         "flights": {"from": first.isoformat(), "to": last_complete.isoformat(), "days": span_days,
                     "prev_from": prev_first.isoformat(), "prev_to": prev_last.isoformat()}}

    with conn.cursor() as cur:
        # HCAA : dernier mois disponible <= mois relevé.
        r = _one(cur, "select year, month from hcaa_crete_monthly where (year*100+month) <= %s order by 1 desc, 2 desc limit 1", (year * 100 + month,))
        if r:
            hy, hm = r
            cur.execute("""select airport_iata,
                                  sum(case when year=%s then pax_total end), sum(case when year=%s then pax_total end),
                                  sum(case when year=%s then aircraft_total end)
                           from hcaa_crete_monthly where month=%s and year in (%s,%s) group by 1 order by 2 desc nulls last""",
                        (hy, hy - 1, hy, hm, hy, hy - 1))
            airports = [{"iata": a, "pax": p, "pax_prev": q, "movements": mv} for a, p, q, mv in cur.fetchall()]
            cur.execute("select year, sum(pax_total) from hcaa_crete_monthly where month<=%s and year in (%s,%s) group by 1", (hm, hy, hy - 1))
            ytd = {int(y): int(v) for y, v in cur.fetchall()}
            cur.execute("select source_xlsx_url from hcaa_crete_monthly where year=%s and month=%s limit 1", (hy, hm))
            src = cur.fetchone()
            d["hcaa"] = {"year": hy, "month": hm, "airports": airports,
                         "ytd": ytd.get(hy), "ytd_prev": ytd.get(hy - 1), "source_url": (src or [None])[0] or SOURCE_HCAA}

        # Vols observés (tableaux d'arrivées) : arrivées par aéroport, période comparable du mois précédent.
        cur.execute("""select airport, count(*) from flux_flight_arrivals
                       where direction='arrival' and service_date between %s and %s group by 1 order by 1""", (first, last_complete))
        cur_arr = dict(cur.fetchall())
        cur.execute("""select airport, count(*) from flux_flight_arrivals
                       where direction='arrival' and service_date between %s and %s group by 1 order by 1""", (prev_first, prev_last))
        prev_arr = dict(cur.fetchall())
        d["flights"]["airports"] = [{"iata": a, "arrivals": int(cur_arr[a]), "arrivals_prev": int(prev_arr.get(a, 0)) or None} for a in sorted(cur_arr)]
        cur.execute("""select date_trunc('week', service_date)::date, count(*) from flux_flight_arrivals
                       where direction='arrival' and service_date between %s and %s group by 1 order by 1""", (first, last_complete))
        weeks = []
        for w, n in cur.fetchall():
            w_end = min(w + timedelta(days=6), last_complete)
            w_start = max(w, first)
            weeks.append({"from": w_start.isoformat(), "to": w_end.isoformat(), "arrivals": int(n), "full": (w_end - w_start).days == 6})
        d["flights"]["weeks"] = weeks
        cur.execute("""select origin, count(*) from flux_flight_arrivals
                       where direction='arrival' and service_date between %s and %s and origin is not null and origin<>''
                       group by 1 order by 2 desc limit 8""", (first, last_complete))
        d["flights"]["origins"] = [{"name": o, "arrivals": int(n)} for o, n in cur.fetchall()]
        cur.execute("""select count(distinct origin) from flux_flight_arrivals
                       where direction='arrival' and service_date between %s and %s and origin is not null and origin<>''""", (first, last_complete))
        d["flights"]["origins_total"] = int(cur.fetchone()[0])

        # Croisières : programme complet du mois + mois suivant.
        def cruise(f, t):
            r = _one(cur, """select count(*), count(distinct ship_name), coalesce(sum(pax_capacity),0), count(distinct call_date)
                             from flux_cruise_calls where port='heraklion' and call_date between %s and %s""", (f, t))
            return {"calls": int(r[0]), "ships": int(r[1]), "capacity": int(r[2]), "days": int(r[3])}
        nxt_end = (nxt.replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(days=1)
        d["cruise"] = {"month": cruise(first, nxt - timedelta(days=1)), "next": cruise(nxt, nxt_end),
                       "next_year": nxt.year, "next_month": nxt.month}
        cur.execute("""select ship_name, count(*), max(pax_capacity) from flux_cruise_calls
                       where port='heraklion' and call_date between %s and %s group by 1 order by 2 desc, 3 desc limit 3""", (first, nxt - timedelta(days=1)))
        d["cruise"]["top_ships"] = [{"name": s, "calls": int(c), "capacity": int(p or 0)} for s, c, p in cur.fetchall()]

        # Inside Airbnb : dernier instantané crete + instantané ~1 an avant.
        r = _one(cur, "select snapshot_date, listings_count, reviews_count from airbnb_snapshots where region='crete' order by snapshot_date desc limit 1")
        if r:
            snap, n_list, n_rev = r
            p = _one(cur, """select snapshot_date, listings_count from airbnb_snapshots where region='crete'
                             and snapshot_date between %s and %s order by abs(snapshot_date - %s) limit 1""",
                     (snap - timedelta(days=430), snap - timedelta(days=300), snap - timedelta(days=365)))
            s = _one(cur, """select count(*), count(*) filter (where license is not null and license<>''),
                                    percentile_cont(0.5) within group (order by price),
                                    count(*) filter (where host_listings_count>=10),
                                    count(*) filter (where room_type='Entire home/apt'),
                                    round(avg(review_scores_rating)::numeric, 2)
                             from airbnb_listings where region='crete' and snapshot_date=%s and price is not null""", (snap,))
            cur.execute("""select neighbourhood, count(*) from airbnb_listings where region='crete' and snapshot_date=%s
                           group by 1 order by 2 desc limit 5""", (snap,))
            areas = [{"name": NEIGHBOURHOODS.get(a, a), "listings": int(n)} for a, n in cur.fetchall()]
            sa = _one(cur, "select snapshot_date, listings_count from airbnb_snapshots where region='south-aegean' order by snapshot_date desc limit 1")
            d["airbnb"] = {"snapshot": snap.isoformat(), "listings": int(n_list), "reviews": int(n_rev),
                           "listings_prev": int(p[1]) if p else None, "snapshot_prev": p[0].isoformat() if p else None,
                           "priced": int(s[0]), "licensed_pct": (s[1] / s[0] * 100.0) if s[0] else None,
                           "median_price": float(s[2]) if s[2] is not None else None,
                           "pro_pct": (s[3] / s[0] * 100.0) if s[0] else None,
                           "entire_pct": (s[4] / s[0] * 100.0) if s[0] else None,
                           "rating": float(s[5]) if s[5] is not None else None, "areas": areas,
                           "south_aegean": {"snapshot": sa[0].isoformat(), "listings": int(sa[1])} if sa else None}

        # Banque de Grèce : dernière année + précédente.
        cur.execute("select year, metric, value from flux_economy_annual where region='crete' and year >= (select max(year)-1 from flux_economy_annual where region='crete')")
        bog = {}
        for y, m, v in cur.fetchall():
            bog.setdefault(int(y), {})[m] = float(v)
        if bog:
            ly = max(bog)
            d["bog"] = {"year": ly, "cur": bog[ly], "prev": bog.get(ly - 1, {})}

        # Arrêts urbains avec passages en direct.
        cur.execute("""select case when slug like 'cha-%%' then 'chania' when slug like 'hkl-%%' then 'heraklion' else 'other' end, count(*)
                       from bus_stops where coords_source='citybus' and api_code is not null group by 1""")
        live = dict(cur.fetchall())
        d["bus_live"] = {"chania": int(live.get("chania", 0)), "heraklion": int(live.get("heraklion", 0))}
    return d


# ---------------------------------------------------------------- rendu

T = {
    "en": {
        "title": "Crete in numbers, {month}: airports, flights, cruises, Airbnb",
        "meta": "The monthly Crete data brief for {month}: airport passengers (HCAA), flights observed day by day, cruise calls in Heraklion, the Airbnb stock, visitor spending. Every figure with its source.",
        "intro": "<p>Every month, crete.direct puts in one place the public figures that describe the island, and adds what we measure ourselves. Nothing here is estimated by a model: each number comes from a named source, cited under its section. Figures for {month} as of {gen}.</p>",
        "h_air": "Airport passengers ({hm})",
        "air_p": "<p>The Hellenic Civil Aviation Authority publishes airport traffic with about one month of delay; the latest month available is <strong>{hm}</strong>. Crete's three airports handled <strong>{total}</strong> passengers, {total_delta} compared with {hm_prev}. Since January, the island has received <strong>{ytd}</strong> passengers ({ytd_delta} on the same months of {prev_year}).</p>",
        "air_cols": ["Airport", "Passengers {hm}", "{hm_prev}", "Change", "Flights"],
        "h_fl": "Flights observed in {month}",
        "fl_p": "<p>crete.direct reads the arrival and departure boards of Heraklion and Chania airports several times a day. From {from} to {to}, we counted <strong>{arr}</strong> scheduled arrivals ({her} in Heraklion, {chq} in Chania), {delta} compared with the same days of {prev_month}. The month's week-by-week curve shows the season winding down.</p>",
        "fl_cols": ["Week", "Arrivals (HER + CHQ)"],
        "fl_or": "<p>Arrivals came from {n_or} different airports. The busiest origins over the period:</p>",
        "or_cols": ["Origin", "Arrivals"],
        "h_cr": "Cruise calls in Heraklion",
        "cr_p": "<p>The port of Heraklion's schedule lists <strong>{calls}</strong> cruise calls in {month} ({ships} different ships, on {days} days), for a combined capacity of <strong>{cap}</strong> passengers. {top} made the most calls ({top_calls}). For {next_month} the schedule already shows {ncalls} calls and {ncap} passenger capacity.</p>",
        "h_ab": "Short-term rentals (Inside Airbnb)",
        "ab_p": "<p>The latest Inside Airbnb snapshot of Crete ({snap}) lists <strong>{n}</strong> active listings{prev_clause}. The median advertised price is <strong>{med}</strong> per night. <strong>{lic}</strong> of listings display a Greek registration number (AMA), {pro} belong to hosts with ten or more listings, and {entire} are entire homes. Average guest rating: {rating} out of 5.{sa}</p>",
        "ab_prev": ", against {p} a year earlier ({d})",
        "ab_sa": " For comparison, the South Aegean (Cyclades and Dodecanese) counts {n} listings.",
        "ab_cols": ["Area", "Listings"],
        "h_bog": "What visitors spend ({y})",
        "bog_p": "<p>The Bank of Greece border survey, the reference for tourism receipts, gives for Crete in {y}: <strong>{visits}</strong> visits, <strong>{receipts}</strong> in receipts, an average stay of <strong>{stay} nights</strong> and <strong>{night}</strong> spent per night ({visit} per visit). In {py}: {pvisits} visits, {preceipts}, {pstay} nights, {pnight} per night.</p>",
        "h_bus": "Live buses on crete.direct",
        "bus_p": "<p>Our <a href=\"/{loc}/live\">live map</a> shows real bus positions at <strong>{n}</strong> urban stops: {her} in Heraklion and {cha} in Chania, read from the Citybus networks every 30 seconds.</p>",
        "h_meth": "Method and sources",
        "meth": "<p>This brief is produced by a script that reads crete.direct's database, with no text generation by a language model. HCAA figures are official and final; the flight counts are our own readings of airport boards (scheduled arrivals, cancellations included) and should be taken as an order of magnitude, not as an official statistic. The cruise schedule may change after publication. Inside Airbnb snapshots are quarterly; a listing is counted if it was visible on the date of the snapshot. The next issue will cover {next}.</p>",
        "src_hcaa": "Hellenic Civil Aviation Authority (HCAA), monthly airport movement",
        "src_boards": "crete.direct, arrival boards of Heraklion and Chania airports",
        "src_port": "Port of Heraklion, cruise schedule",
        "src_airbnb": "Inside Airbnb, Crete snapshot of {snap}",
        "src_bog": "Bank of Greece, border survey, regional data",
        "src_bus": "crete.direct, Citybus Heraklion and Chania networks",
        "faq": [
            ("How many passengers did Crete's airports handle in {hm}?", "{total} passengers across Heraklion, Chania and Sitia, according to the HCAA, {total_delta} compared with {hm_prev}."),
            ("How many Airbnb listings are there in Crete?", "{n} listings on the Inside Airbnb snapshot of {snap}, with a median advertised price of {med} per night and {lic} showing a registration number."),
            ("Where do these figures come from?", "From public sources (HCAA, Port of Heraklion, Inside Airbnb, Bank of Greece) and from crete.direct's own readings of airport boards and bus networks. Each section cites its source."),
        ],
    },
    "fr": {
        "title": "La Crète en chiffres, {month} : aéroports, vols, croisières, Airbnb",
        "meta": "Le relevé mensuel de la Crète pour {month} : passagers des aéroports (HCAA), vols observés jour par jour, escales de croisière à Héraklion, parc Airbnb, dépense des visiteurs. Chaque chiffre avec sa source.",
        "intro": "<p>Chaque mois, crete.direct réunit au même endroit les chiffres publics qui décrivent l'île, et y ajoute ce que nous mesurons nous-mêmes. Rien ici n'est estimé par un modèle : chaque nombre vient d'une source nommée, citée sous sa section. Chiffres {month_de}, arrêtés au {gen}.</p>",
        "h_air": "Passagers des aéroports ({hm})",
        "air_p": "<p>L'Autorité hellénique de l'aviation civile publie le trafic des aéroports avec environ un mois de délai ; le dernier mois disponible est <strong>{hm}</strong>. Les trois aéroports de Crète ont accueilli <strong>{total}</strong> passagers, soit {total_delta} par rapport à {hm_prev}. Depuis janvier, l'île a reçu <strong>{ytd}</strong> passagers ({ytd_delta} sur les mêmes mois de {prev_year}).</p>",
        "air_cols": ["Aéroport", "Passagers {hm}", "{hm_prev}", "Évolution", "Vols"],
        "h_fl": "Vols observés en {month}",
        "fl_p": "<p>crete.direct lit plusieurs fois par jour les tableaux d'arrivées et de départs des aéroports d'Héraklion et de La Canée. Du {from} au {to}, nous avons compté <strong>{arr}</strong> arrivées programmées ({her} à Héraklion, {chq} à La Canée), soit {delta} par rapport aux mêmes jours de {prev_month}. La courbe semaine par semaine montre la fin de saison.</p>",
        "fl_cols": ["Semaine", "Arrivées (HER + CHQ)"],
        "fl_or": "<p>Les arrivées venaient de {n_or} aéroports différents. Les origines les plus fréquentes sur la période :</p>",
        "or_cols": ["Origine", "Arrivées"],
        "h_cr": "Escales de croisière à Héraklion",
        "cr_p": "<p>Le programme du port d'Héraklion compte <strong>{calls}</strong> escales de croisière en {month} ({ships} navires différents, sur {days} jours), pour une capacité cumulée de <strong>{cap}</strong> passagers. {top} a fait le plus d'escales ({top_calls}). Pour {next_month}, le programme affiche déjà {ncalls} escales et {ncap} passagers de capacité.</p>",
        "h_ab": "Locations courtes (Inside Airbnb)",
        "ab_p": "<p>Le dernier instantané Inside Airbnb de la Crète ({snap}) recense <strong>{n}</strong> annonces actives{prev_clause}. Le prix médian affiché est de <strong>{med}</strong> par nuit. <strong>{lic}</strong> des annonces affichent un numéro d'enregistrement grec (AMA), {pro} appartiennent à des hôtes de dix annonces ou plus, et {entire} sont des logements entiers. Note moyenne des voyageurs : {rating} sur 5.{sa}</p>",
        "ab_prev": ", contre {p} un an plus tôt ({d})",
        "ab_sa": " À titre de comparaison, l'Égée du Sud (Cyclades et Dodécanèse) compte {n} annonces.",
        "ab_cols": ["Zone", "Annonces"],
        "h_bog": "Ce que dépensent les visiteurs ({y})",
        "bog_p": "<p>L'enquête aux frontières de la Banque de Grèce, référence pour les recettes touristiques, donne pour la Crète en {y} : <strong>{visits}</strong> de visites, <strong>{receipts}</strong> de recettes, un séjour moyen de <strong>{stay} nuits</strong> et <strong>{night}</strong> dépensés par nuit ({visit} par visite). En {py} : {pvisits} de visites, {preceipts}, {pstay} nuits, {pnight} par nuit.</p>",
        "h_bus": "Les bus en direct sur crete.direct",
        "bus_p": "<p>Notre <a href=\"/{loc}/live\">carte en direct</a> affiche la position réelle des bus à <strong>{n}</strong> arrêts urbains : {her} à Héraklion et {cha} à La Canée, lue sur les réseaux Citybus toutes les 30 secondes.</p>",
        "h_meth": "Méthode et sources",
        "meth": "<p>Ce relevé est produit par un script qui lit la base de données de crete.direct, sans aucune génération de texte par un modèle de langage. Les chiffres HCAA sont officiels et définitifs ; les comptages de vols sont nos propres lectures des tableaux d'aéroport (arrivées programmées, annulations comprises) et valent comme ordre de grandeur, pas comme statistique officielle. Le programme des croisières peut changer après publication. Les instantanés Inside Airbnb sont trimestriels ; une annonce est comptée si elle était visible à la date de l'instantané. Le prochain numéro couvrira {next}.</p>",
        "src_hcaa": "Autorité hellénique de l'aviation civile (HCAA), mouvement mensuel des aéroports",
        "src_boards": "crete.direct, tableaux d'arrivées des aéroports d'Héraklion et de La Canée",
        "src_port": "Port d'Héraklion, programme des croisières",
        "src_airbnb": "Inside Airbnb, instantané Crète du {snap}",
        "src_bog": "Banque de Grèce, enquête aux frontières, données régionales",
        "src_bus": "crete.direct, réseaux Citybus Héraklion et La Canée",
        "faq": [
            ("Combien de passagers les aéroports de Crète ont-ils accueillis en {hm} ?", "{total} passagers à Héraklion, La Canée et Sitia, selon la HCAA, soit {total_delta} par rapport à {hm_prev}."),
            ("Combien d'annonces Airbnb compte la Crète ?", "{n} annonces sur l'instantané Inside Airbnb du {snap}, avec un prix médian affiché de {med} par nuit et {lic} d'annonces avec numéro d'enregistrement."),
            ("D'où viennent ces chiffres ?", "De sources publiques (HCAA, port d'Héraklion, Inside Airbnb, Banque de Grèce) et des lectures propres de crete.direct sur les tableaux d'aéroport et les réseaux de bus. Chaque section cite sa source."),
        ],
    },
    "de": {
        "title": "Kreta in Zahlen, {month}: Flughäfen, Flüge, Kreuzfahrten, Airbnb",
        "meta": "Der monatliche Datenbericht zu Kreta für {month}: Flughafenpassagiere (HCAA), Tag für Tag beobachtete Flüge, Kreuzfahrtanläufe in Heraklion, Airbnb-Bestand, Ausgaben der Besucher. Jede Zahl mit Quelle.",
        "intro": "<p>Jeden Monat stellt crete.direct die öffentlichen Zahlen, die die Insel beschreiben, an einem Ort zusammen und ergänzt sie um eigene Messungen. Nichts hier wird von einem Modell geschätzt: Jede Zahl stammt aus einer benannten Quelle, die unter ihrem Abschnitt steht. Zahlen für {month}, Stand {gen}.</p>",
        "h_air": "Flughafenpassagiere ({hm})",
        "air_p": "<p>Die griechische Zivilluftfahrtbehörde veröffentlicht den Flughafenverkehr mit etwa einem Monat Verzögerung; der jüngste verfügbare Monat ist <strong>{hm}</strong>. Die drei Flughäfen Kretas zählten <strong>{total}</strong> Passagiere, {total_delta} gegenüber {hm_prev}. Seit Januar hat die Insel <strong>{ytd}</strong> Passagiere empfangen ({ytd_delta} gegenüber denselben Monaten {prev_year}).</p>",
        "air_cols": ["Flughafen", "Passagiere {hm}", "{hm_prev}", "Veränderung", "Flüge"],
        "h_fl": "Beobachtete Flüge im {month}",
        "fl_p": "<p>crete.direct liest mehrmals täglich die Ankunfts- und Abflugtafeln der Flughäfen Heraklion und Chania. Vom {from} bis {to} haben wir <strong>{arr}</strong> geplante Ankünfte gezählt ({her} in Heraklion, {chq} in Chania), {delta} gegenüber denselben Tagen im {prev_month}. Die Kurve Woche für Woche zeigt das Ende der Saison.</p>",
        "fl_cols": ["Woche", "Ankünfte (HER + CHQ)"],
        "fl_or": "<p>Die Ankünfte kamen von {n_or} verschiedenen Flughäfen. Die häufigsten Abflugorte im Zeitraum:</p>",
        "or_cols": ["Abflugort", "Ankünfte"],
        "h_cr": "Kreuzfahrtanläufe in Heraklion",
        "cr_p": "<p>Der Fahrplan des Hafens Heraklion verzeichnet <strong>{calls}</strong> Kreuzfahrtanläufe im {month} ({ships} verschiedene Schiffe an {days} Tagen) mit einer Gesamtkapazität von <strong>{cap}</strong> Passagieren. {top} lief am häufigsten an ({top_calls}). Für {next_month} zeigt der Fahrplan bereits {ncalls} Anläufe und {ncap} Passagiere Kapazität.</p>",
        "h_ab": "Kurzzeitvermietung (Inside Airbnb)",
        "ab_p": "<p>Der jüngste Inside-Airbnb-Snapshot von Kreta ({snap}) zählt <strong>{n}</strong> aktive Inserate{prev_clause}. Der mittlere angezeigte Preis liegt bei <strong>{med}</strong> pro Nacht. <strong>{lic}</strong> der Inserate zeigen eine griechische Registrierungsnummer (AMA), {pro} gehören Gastgebern mit zehn oder mehr Inseraten, und {entire} sind ganze Unterkünfte. Durchschnittliche Gästebewertung: {rating} von 5.{sa}</p>",
        "ab_prev": ", gegenüber {p} ein Jahr zuvor ({d})",
        "ab_sa": " Zum Vergleich: Die Südliche Ägäis (Kykladen und Dodekanes) zählt {n} Inserate.",
        "ab_cols": ["Gebiet", "Inserate"],
        "h_bog": "Was Besucher ausgeben ({y})",
        "bog_p": "<p>Die Grenzbefragung der Bank von Griechenland, Referenz für die Tourismuseinnahmen, ergibt für Kreta {y}: <strong>{visits}</strong> Besuche, <strong>{receipts}</strong> Einnahmen, eine durchschnittliche Aufenthaltsdauer von <strong>{stay} Nächten</strong> und <strong>{night}</strong> Ausgaben pro Nacht ({visit} pro Besuch). {py}: {pvisits} Besuche, {preceipts}, {pstay} Nächte, {pnight} pro Nacht.</p>",
        "h_bus": "Busse live auf crete.direct",
        "bus_p": "<p>Unsere <a href=\"/{loc}/live\">Live-Karte</a> zeigt echte Buspositionen an <strong>{n}</strong> städtischen Haltestellen: {her} in Heraklion und {cha} in Chania, alle 30 Sekunden aus den Citybus-Netzen gelesen.</p>",
        "h_meth": "Methode und Quellen",
        "meth": "<p>Dieser Bericht wird von einem Skript erzeugt, das die Datenbank von crete.direct liest, ohne Textgenerierung durch ein Sprachmodell. Die HCAA-Zahlen sind amtlich und endgültig; die Flugzählungen sind unsere eigenen Ablesungen der Flughafentafeln (geplante Ankünfte, Annullierungen eingeschlossen) und gelten als Größenordnung, nicht als amtliche Statistik. Der Kreuzfahrtfahrplan kann sich nach Veröffentlichung ändern. Inside-Airbnb-Snapshots sind vierteljährlich; ein Inserat zählt, wenn es am Stichtag sichtbar war. Die nächste Ausgabe behandelt {next}.</p>",
        "src_hcaa": "Griechische Zivilluftfahrtbehörde (HCAA), monatlicher Flughafenverkehr",
        "src_boards": "crete.direct, Ankunftstafeln der Flughäfen Heraklion und Chania",
        "src_port": "Hafen Heraklion, Kreuzfahrtfahrplan",
        "src_airbnb": "Inside Airbnb, Kreta-Snapshot vom {snap}",
        "src_bog": "Bank von Griechenland, Grenzbefragung, regionale Daten",
        "src_bus": "crete.direct, Citybus-Netze Heraklion und Chania",
        "faq": [
            ("Wie viele Passagiere zählten die Flughäfen Kretas im {hm}?", "{total} Passagiere in Heraklion, Chania und Sitia laut HCAA, {total_delta} gegenüber {hm_prev}."),
            ("Wie viele Airbnb-Inserate gibt es auf Kreta?", "{n} Inserate im Inside-Airbnb-Snapshot vom {snap}, mit einem mittleren angezeigten Preis von {med} pro Nacht und {lic} Inseraten mit Registrierungsnummer."),
            ("Woher stammen diese Zahlen?", "Aus öffentlichen Quellen (HCAA, Hafen Heraklion, Inside Airbnb, Bank von Griechenland) und aus eigenen Ablesungen von crete.direct an Flughafentafeln und Busnetzen. Jeder Abschnitt nennt seine Quelle."),
        ],
    },
    "el": {
        "title": "Η Κρήτη σε αριθμούς, {month}: αεροδρόμια, πτήσεις, κρουαζιέρες, Airbnb",
        "meta": "Η μηνιαία αναφορά δεδομένων για την Κρήτη, {month}: επιβάτες αεροδρομίων (ΥΠΑ), πτήσεις μέρα με τη μέρα, προσεγγίσεις κρουαζιερόπλοιων στο Ηράκλειο, καταχωρήσεις Airbnb, δαπάνη επισκεπτών. Κάθε αριθμός με την πηγή του.",
        "intro": "<p>Κάθε μήνα το crete.direct συγκεντρώνει σε ένα σημείο τα δημόσια στοιχεία που περιγράφουν το νησί και προσθέτει όσα μετράμε εμείς. Τίποτα εδώ δεν είναι εκτίμηση μοντέλου: κάθε αριθμός προέρχεται από συγκεκριμένη πηγή, που αναφέρεται κάτω από την ενότητά του. Στοιχεία {month}, όπως είχαν στις {gen}.</p>",
        "h_air": "Επιβάτες αεροδρομίων ({hm_nom})",
        "air_p": "<p>Η Υπηρεσία Πολιτικής Αεροπορίας δημοσιεύει την κίνηση των αεροδρομίων με καθυστέρηση περίπου ενός μήνα· ο πιο πρόσφατος διαθέσιμος μήνας είναι ο <strong>{hm_nom}</strong>. Τα τρία αεροδρόμια της Κρήτης εξυπηρέτησαν <strong>{total}</strong> επιβάτες, {total_delta} σε σχέση με τον {hm_prev_acc}. Από τον Ιανουάριο, το νησί έχει υποδεχθεί <strong>{ytd}</strong> επιβάτες ({ytd_delta} σε σχέση με τους ίδιους μήνες του {prev_year}).</p>",
        "air_cols": ["Αεροδρόμιο", "Επιβάτες {hm}", "{hm_prev}", "Μεταβολή", "Πτήσεις"],
        "h_fl": "Πτήσεις που καταγράψαμε τον {month_acc}",
        "fl_p": "<p>Το crete.direct διαβάζει πολλές φορές την ημέρα τους πίνακες αφίξεων και αναχωρήσεων των αεροδρομίων Ηρακλείου και Χανίων. Από {from} έως {to} μετρήσαμε <strong>{arr}</strong> προγραμματισμένες αφίξεις ({her} στο Ηράκλειο, {chq} στα Χανιά), {delta} σε σχέση με τις ίδιες ημέρες του {prev_month}. Η καμπύλη εβδομάδα προς εβδομάδα δείχνει το τέλος της σεζόν.</p>",
        "fl_cols": ["Εβδομάδα", "Αφίξεις (HER + CHQ)"],
        "fl_or": "<p>Οι αφίξεις προέρχονταν από {n_or} διαφορετικά αεροδρόμια. Οι συχνότερες προελεύσεις της περιόδου:</p>",
        "or_cols": ["Προέλευση", "Αφίξεις"],
        "h_cr": "Προσεγγίσεις κρουαζιερόπλοιων στο Ηράκλειο",
        "cr_p": "<p>Το πρόγραμμα του λιμένα Ηρακλείου καταγράφει <strong>{calls}</strong> προσεγγίσεις κρουαζιερόπλοιων τον {month_acc} ({ships} διαφορετικά πλοία, σε {days} ημέρες), με συνολική χωρητικότητα <strong>{cap}</strong> επιβατών. Το {top} έκανε τις περισσότερες προσεγγίσεις ({top_calls}). Για τον {next_month_acc} το πρόγραμμα δείχνει ήδη {ncalls} προσεγγίσεις και χωρητικότητα {ncap} επιβατών.</p>",
        "h_ab": "Βραχυχρόνια μίσθωση (Inside Airbnb)",
        "ab_p": "<p>Το πιο πρόσφατο στιγμιότυπο του Inside Airbnb για την Κρήτη ({snap}) καταγράφει <strong>{n}</strong> ενεργές καταχωρήσεις{prev_clause}. Η διάμεση αναγραφόμενη τιμή είναι <strong>{med}</strong> ανά διανυκτέρευση. Το <strong>{lic}</strong> των καταχωρήσεων εμφανίζει ελληνικό αριθμό μητρώου (ΑΜΑ), το {pro} ανήκει σε οικοδεσπότες με δέκα ή περισσότερες καταχωρήσεις και το {entire} είναι ολόκληρα καταλύματα. Μέση βαθμολογία επισκεπτών: {rating} στα 5.{sa}</p>",
        "ab_prev": ", έναντι {p} έναν χρόνο πριν ({d})",
        "ab_sa": " Για σύγκριση, το Νότιο Αιγαίο (Κυκλάδες και Δωδεκάνησα) μετρά {n} καταχωρήσεις.",
        "ab_cols": ["Περιοχή", "Καταχωρήσεις"],
        "h_bog": "Τι ξοδεύουν οι επισκέπτες ({y})",
        "bog_p": "<p>Η Έρευνα Συνόρων της Τράπεζας της Ελλάδος, η αναφορά για τις τουριστικές εισπράξεις, δίνει για την Κρήτη το {y}: <strong>{visits}</strong> επισκέψεις, <strong>{receipts}</strong> εισπράξεις, μέση διάρκεια παραμονής <strong>{stay} διανυκτερεύσεις</strong> και <strong>{night}</strong> δαπάνη ανά διανυκτέρευση ({visit} ανά επίσκεψη). Το {py}: {pvisits} επισκέψεις, {preceipts}, {pstay} διανυκτερεύσεις, {pnight} ανά διανυκτέρευση.</p>",
        "h_bus": "Λεωφορεία σε πραγματικό χρόνο στο crete.direct",
        "bus_p": "<p>Ο <a href=\"/{loc}/live\">ζωντανός χάρτης</a> μας δείχνει την πραγματική θέση των λεωφορείων σε <strong>{n}</strong> αστικές στάσεις: {her} στο Ηράκλειο και {cha} στα Χανιά, από τα δίκτυα Citybus κάθε 30 δευτερόλεπτα.</p>",
        "h_meth": "Μέθοδος και πηγές",
        "meth": "<p>Η αναφορά αυτή παράγεται από ένα σκριπτ που διαβάζει τη βάση δεδομένων του crete.direct, χωρίς παραγωγή κειμένου από γλωσσικό μοντέλο. Τα στοιχεία της ΥΠΑ είναι επίσημα και οριστικά· οι μετρήσεις πτήσεων είναι δικές μας αναγνώσεις των πινάκων των αεροδρομίων (προγραμματισμένες αφίξεις, μαζί με ακυρώσεις) και αποτελούν τάξη μεγέθους, όχι επίσημη στατιστική. Το πρόγραμμα κρουαζιέρας μπορεί να αλλάξει μετά τη δημοσίευση. Τα στιγμιότυπα του Inside Airbnb είναι τριμηνιαία· μια καταχώρηση μετράται αν ήταν ορατή την ημερομηνία του στιγμιότυπου. Το επόμενο τεύχος θα καλύψει τον {next_acc}.</p>",
        "src_hcaa": "Υπηρεσία Πολιτικής Αεροπορίας (ΥΠΑ), μηνιαία κίνηση αερολιμένων",
        "src_boards": "crete.direct, πίνακες αφίξεων αεροδρομίων Ηρακλείου και Χανίων",
        "src_port": "Λιμένας Ηρακλείου, πρόγραμμα κρουαζιέρας",
        "src_airbnb": "Inside Airbnb, στιγμιότυπο Κρήτης {snap}",
        "src_bog": "Τράπεζα της Ελλάδος, Έρευνα Συνόρων, περιφερειακά στοιχεία",
        "src_bus": "crete.direct, δίκτυα Citybus Ηρακλείου και Χανίων",
        "faq": [
            ("Πόσους επιβάτες εξυπηρέτησαν τα αεροδρόμια της Κρήτης τον {hm_acc};", "{total} επιβάτες σε Ηράκλειο, Χανιά και Σητεία σύμφωνα με την ΥΠΑ, {total_delta} σε σχέση με τον {hm_prev_acc}."),
            ("Πόσες καταχωρήσεις Airbnb υπάρχουν στην Κρήτη;", "{n} καταχωρήσεις στο στιγμιότυπο του Inside Airbnb της {snap}, με διάμεση αναγραφόμενη τιμή {med} ανά διανυκτέρευση και {lic} καταχωρήσεις με αριθμό μητρώου."),
            ("Από πού προέρχονται αυτά τα στοιχεία;", "Από δημόσιες πηγές (ΥΠΑ, Λιμένας Ηρακλείου, Inside Airbnb, Τράπεζα της Ελλάδος) και από τις δικές μας αναγνώσεις του crete.direct σε πίνακες αεροδρομίων και δίκτυα λεωφορείων. Κάθε ενότητα αναφέρει την πηγή της."),
        ],
    },
}


def fmt_date(locale, iso):
    d = date.fromisoformat(iso)
    if locale == "en":
        return f"{d.day} {MONTHS['en'][d.month - 1]} {d.year}"
    if locale == "de":
        return f"{d.day}. {MONTHS['de'][d.month - 1]} {d.year}"
    if locale == "el":
        return f"{d.day} {MONTHS_EL_GEN[d.month - 1]} {d.year}"
    return f"{d.day} {MONTHS['fr'][d.month - 1]} {d.year}"


def fmt_day(locale, iso):
    """Jour + mois, sans l'année (bornes de période)."""
    d = date.fromisoformat(iso)
    if locale == "en":
        return f"{d.day} {MONTHS['en'][d.month - 1]}"
    if locale == "de":
        return f"{d.day}. {MONTHS['de'][d.month - 1]}"
    if locale == "el":
        return f"{d.day} {MONTHS_EL_GEN[d.month - 1]}"
    return f"{d.day}{'er' if d.day == 1 else ''} {MONTHS['fr'][d.month - 1]}"


def delta_words(x, locale):
    """« +3,9 % » rendu lisible : en hausse de 3,9 % / en baisse de 3,9 % / stable."""
    if x is None:
        return {"en": "no comparison available", "fr": "sans comparaison disponible", "de": "kein Vergleich verfügbar", "el": "χωρίς διαθέσιμη σύγκριση"}[locale]
    if abs(x) < 0.05:
        return {"en": "unchanged", "fr": "stable", "de": "unverändert", "el": "αμετάβλητο"}[locale]
    p = fmt_pct(x, locale, signed=False)
    up = x > 0
    return {"en": f"{'up' if up else 'down'} {p}", "fr": f"{'en hausse' if up else 'en baisse'} de {p}",
            "de": f"{'ein Plus' if up else 'ein Minus'} von {p}", "el": f"{'αύξηση' if up else 'μείωση'} {p}"}[locale]


def slug_for(year, month):
    return f"crete-in-numbers-{year}-{month:02d}"


def render(d, locale):
    t = T[locale]
    y, m = d["year"], d["month"]
    month = month_label(locale, y, m) if locale != "en" else f"{MONTHS['en'][m - 1]} {y}"
    if locale == "el":
        month_nom = f"{MONTHS['el'][m - 1]} {y}"
    else:
        month_nom = month
    month_acc = month_label(locale, y, m, "acc")
    parts = [t["intro"].format(month=month, month_de=de_month(locale, month), gen=fmt_date(locale, d["generated_on"]))]
    faq_ctx = {}

    # Aéroports HCAA
    h = d.get("hcaa")
    if h:
        hm = month_label(locale, h["year"], h["month"]) if locale != "en" else f"{MONTHS['en'][h['month'] - 1]} {h['year']}"
        hm_prev = month_label(locale, h["year"] - 1, h["month"]) if locale != "en" else f"{MONTHS['en'][h['month'] - 1]} {h['year'] - 1}"
        total = sum(a["pax"] or 0 for a in h["airports"])
        total_prev = sum(a["pax_prev"] or 0 for a in h["airports"])
        rows = []
        for a in h["airports"]:
            rows.append([AIRPORTS.get(a["iata"], {}).get(locale, a["iata"]) + f" ({a['iata']})", fmt_int(a["pax"], locale),
                         fmt_int(a["pax_prev"], locale), fmt_pct(pct_change(a["pax"], a["pax_prev"]), locale), fmt_int(a["movements"], locale)])
        rows.append([{"en": "Total", "fr": "Total", "de": "Gesamt", "el": "Σύνολο"}[locale], fmt_int(total, locale), fmt_int(total_prev, locale),
                     fmt_pct(pct_change(total, total_prev), locale), fmt_int(sum(a["movements"] or 0 for a in h["airports"]), locale)])
        hm_nom, hm_acc = month_label(locale, h["year"], h["month"], "nom"), month_label(locale, h["year"], h["month"], "acc")
        hm_prev_acc = month_label(locale, h["year"] - 1, h["month"], "acc")
        faq_ctx.update(hm=hm, hm_nom=hm_nom, hm_acc=hm_acc, hm_prev=hm_prev, hm_prev_acc=hm_prev_acc, total=fmt_int(total, locale), total_delta=delta_words(pct_change(total, total_prev), locale))
        parts.append(f'<h2 id="airports">{esc(t["h_air"].format(hm=hm, hm_nom=hm_nom))}</h2>')
        parts.append(t["air_p"].format(hm=hm, hm_nom=hm_nom, hm_prev=hm_prev, hm_prev_acc=hm_prev_acc, total=fmt_int(total, locale), total_delta=delta_words(pct_change(total, total_prev), locale),
                                       ytd=fmt_int(h["ytd"], locale), ytd_delta=delta_words(pct_change(h["ytd"], h["ytd_prev"]), locale), prev_year=h["year"] - 1))
        parts.append(table([c.format(hm=hm, hm_prev=hm_prev) for c in t["air_cols"]], rows))
        parts.append(source_line(locale, t["src_hcaa"], h["source_url"], hm))

    # Vols observés
    f = d["flights"]
    if f.get("airports"):
        arr = sum(a["arrivals"] for a in f["airports"])
        arr_prev = sum(a["arrivals_prev"] or 0 for a in f["airports"])
        by = {a["iata"]: a["arrivals"] for a in f["airports"]}
        pm = date.fromisoformat(f["prev_from"])
        prev_month = month_label(locale, pm.year, pm.month) if locale != "en" else f"{MONTHS['en'][pm.month - 1]} {pm.year}"
        parts.append(f'<h2 id="flights">{esc(t["h_fl"].format(month=month, month_acc=month_acc))}</h2>')
        parts.append(t["fl_p"].format(**{"from": fmt_day(locale, f["from"]), "to": fmt_day(locale, f["to"]), "arr": fmt_int(arr, locale),
                                                       "her": fmt_int(by.get("HER"), locale), "chq": fmt_int(by.get("CHQ"), locale),
                                                       "delta": delta_words(pct_change(arr, arr_prev), locale), "prev_month": prev_month}))
        wrows = []
        for w in f["weeks"]:
            label = f"{fmt_day(locale, w['from'])} – {fmt_day(locale, w['to'])}"
            if not w["full"]:
                label += {"en": " (partial)", "fr": " (partielle)", "de": " (unvollständig)", "el": " (μερική)"}[locale]
            wrows.append([label, fmt_int(w["arrivals"], locale)])
        parts.append(table(t["fl_cols"], wrows))
        if f.get("origins"):
            parts.append(t["fl_or"].format(n_or=fmt_int(f["origins_total"], locale)))
            parts.append(table(t["or_cols"], [[city(locale, o["name"]), fmt_int(o["arrivals"], locale)] for o in f["origins"]]))
        parts.append(source_line(locale, t["src_boards"], f"https://{HOST}/{locale}/live", f"{fmt_day(locale, f['from'])} – {fmt_day(locale, f['to'])}"))

    # Croisières
    c = d.get("cruise")
    if c and c["month"]["calls"]:
        nm = month_label(locale, c["next_year"], c["next_month"]) if locale != "en" else f"{MONTHS['en'][c['next_month'] - 1]} {c['next_year']}"
        top = c["top_ships"][0] if c["top_ships"] else {"name": "–", "calls": 0}
        parts.append(f'<h2 id="cruises">{esc(t["h_cr"])}</h2>')
        nm_acc = month_label(locale, c["next_year"], c["next_month"], "acc")
        parts.append(t["cr_p"].format(calls=fmt_int(c["month"]["calls"], locale), month=month, month_acc=month_acc, next_month_acc=nm_acc, ships=fmt_int(c["month"]["ships"], locale),
                                      days=fmt_int(c["month"]["days"], locale), cap=fmt_int(c["month"]["capacity"], locale),
                                      top=esc(top["name"]), top_calls=fmt_int(top["calls"], locale), next_month=nm,
                                      ncalls=fmt_int(c["next"]["calls"], locale), ncap=fmt_int(c["next"]["capacity"], locale)))
        parts.append(source_line(locale, t["src_port"], SOURCE_PORT, month))

    # Airbnb
    a = d.get("airbnb")
    if a:
        prev_clause = ""
        if a.get("listings_prev"):
            prev_clause = t["ab_prev"].format(p=fmt_int(a["listings_prev"], locale), d=fmt_pct(pct_change(a["listings"], a["listings_prev"]), locale))
        sa = t["ab_sa"].format(n=fmt_int(a["south_aegean"]["listings"], locale)) if a.get("south_aegean") else ""
        snap = fmt_date(locale, a["snapshot"])
        parts.append(f'<h2 id="airbnb">{esc(t["h_ab"])}</h2>')
        parts.append(t["ab_p"].format(snap=snap, n=fmt_int(a["listings"], locale), prev_clause=prev_clause, med=fmt_eur(a["median_price"], locale),
                                      lic=fmt_pct(a["licensed_pct"], locale, signed=False), pro=fmt_pct(a["pro_pct"], locale, signed=False),
                                      entire=fmt_pct(a["entire_pct"], locale, signed=False), rating=fmt_dec(a["rating"], locale, 2), sa=sa))
        parts.append(table(t["ab_cols"], [[ar["name"], fmt_int(ar["listings"], locale)] for ar in a["areas"]]))
        parts.append(source_line(locale, t["src_airbnb"].format(snap=snap), SOURCE_AIRBNB, None))
        faq_ctx.update(n=fmt_int(a["listings"], locale), snap=snap, med=fmt_eur(a["median_price"], locale), lic=fmt_pct(a["licensed_pct"], locale, signed=False))

    # Banque de Grèce
    b = d.get("bog")
    if b and b["cur"].get("visits"):
        cu, pv = b["cur"], b["prev"]
        def m_eur(v):
            return {"en": f"€{fmt_dec(v / 1000, locale, 2)} billion", "fr": f"{fmt_dec(v / 1000, locale, 2)} milliards d'euros",
                    "de": f"{fmt_dec(v / 1000, locale, 2)} Milliarden Euro", "el": f"{fmt_dec(v / 1000, locale, 2)} δισ. ευρώ"}[locale]
        def m_visits(v):
            return {"en": f"{fmt_dec(v / 1000, locale, 2)} million", "fr": f"{fmt_dec(v / 1000, locale, 2)} millions",
                    "de": f"{fmt_dec(v / 1000, locale, 2)} Millionen", "el": f"{fmt_dec(v / 1000, locale, 2)} εκατ."}[locale]
        parts.append(f'<h2 id="spending">{esc(t["h_bog"].format(y=b["year"]))}</h2>')
        parts.append(t["bog_p"].format(y=b["year"], py=b["year"] - 1, visits=m_visits(cu["visits"]), receipts=m_eur(cu["receipts"]),
                                       stay=fmt_dec(cu["average_stay"], locale, 1), night=fmt_eur(cu["expenditure_per_night"], locale),
                                       visit=fmt_eur(cu["expenditure_per_visit"], locale),
                                       pvisits=m_visits(pv["visits"]) if pv.get("visits") else "–", preceipts=m_eur(pv["receipts"]) if pv.get("receipts") else "–",
                                       pstay=fmt_dec(pv.get("average_stay"), locale, 1), pnight=fmt_eur(pv.get("expenditure_per_night"), locale)))
        parts.append(source_line(locale, t["src_bog"], SOURCE_BOG, str(b["year"])))

    # Bus live
    bl = d.get("bus_live")
    if bl and (bl["chania"] + bl["heraklion"]):
        parts.append(f'<h2 id="buses">{esc(t["h_bus"])}</h2>')
        parts.append(t["bus_p"].format(loc=locale, n=fmt_int(bl["chania"] + bl["heraklion"], locale), her=fmt_int(bl["heraklion"], locale), cha=fmt_int(bl["chania"], locale)))
        parts.append(source_line(locale, t["src_bus"], SOURCE_BUS, None))

    # Méthode
    nxt_y, nxt_m = (y + 1, 1) if m == 12 else (y, m + 1)
    nxt_label = month_label(locale, nxt_y, nxt_m) if locale != "en" else f"{MONTHS['en'][nxt_m - 1]} {nxt_y}"
    parts.append(f'<h2 id="method">{esc(t["h_meth"])}</h2>')
    parts.append(t["meth"].format(next=nxt_label, next_acc=month_label(locale, nxt_y, nxt_m, "acc")))

    faqs = []
    for q, ans in t["faq"]:
        try:
            faqs.append({"q": q.format(**faq_ctx), "a": ans.format(**faq_ctx)})
        except KeyError:
            continue  # section absente ce mois-ci : la question tombe
    return {"title": t["title"].format(month=month_nom), "meta": t["meta"].format(month=month_nom),
            "html": "\n".join(parts), "faqs": faqs}


def build_guide(d):
    slug = slug_for(d["year"], d["month"])
    out = {loc: render(d, loc) for loc in LOCALES}
    words = len(out["en"]["html"].replace("<", " <").split())
    return {"slug": slug, "format": "long", "category": "data",
            "keywords": ["crete-in-numbers", "data", "hcaa", "airbnb", "cruises", f"{d['year']}-{d['month']:02d}"],
            "titles": {l: out[l]["title"] for l in LOCALES}, "meta_descs": {l: out[l]["meta"] for l in LOCALES},
            "contents": {l: out[l]["html"] for l in LOCALES}, "faqs": {l: out[l]["faqs"] for l in LOCALES},
            "read_time": max(2, round(words / 220))}


# ---------------------------------------------------------------- CLI

PREVIEW_SHELL = """<!doctype html><html lang="{loc}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title}</title><style>
body{{margin:0;background:#fff;color:#1f2a30;font-family:Georgia,'Times New Roman',serif;font-size:18px;line-height:1.7}}
main{{max-width:720px;margin:0 auto;padding:24px 16px 64px}}
h1{{font-family:Comfortaa,system-ui,sans-serif;font-size:34px;line-height:1.2;margin:16px 0 8px}}
.meta{{font-family:system-ui,sans-serif;font-size:14px;color:#5b6b74;margin-bottom:32px}}
.article-prose h2{{font-family:Comfortaa,system-ui,sans-serif;font-size:24px;margin:40px 0 12px}}
.article-prose p{{margin:0 0 16px}}
.article-prose table{{width:100%;border-collapse:collapse;margin:24px 0;font-size:16px;display:block;overflow-x:auto}}
.article-prose th,.article-prose td{{border:1px solid #E5E7EB;padding:10px 14px;text-align:left}}
.article-prose th{{background:#E8F1F5;font-weight:600}}
.article-prose a{{color:#009fb0}}
.source-attribution{{font-family:system-ui,sans-serif;font-size:14px;color:#5b6b74}}
.faq{{margin-top:48px;border-top:1px solid #E5E7EB;padding-top:24px}} .faq h3{{font-size:18px;margin:16px 0 4px}}
</style></head><body><main><p class="meta">data · {read} min</p><h1>{title}</h1><p class="meta">{meta}</p>
<div class="article-prose">{html}</div><section class="faq">{faq}</section></main></body></html>"""


def write_preview(guide, out_dir):
    os.makedirs(out_dir, exist_ok=True)
    for loc in LOCALES:
        faq = "".join(f"<h3>{esc(f['q'])}</h3><p>{esc(f['a'])}</p>" for f in guide["faqs"][loc])
        with open(os.path.join(out_dir, f"{guide['slug']}.{loc}.html"), "w", encoding="utf-8") as fh:
            fh.write(PREVIEW_SHELL.format(loc=loc, title=esc(guide["titles"][loc]), meta=esc(guide["meta_descs"][loc]),
                                          html=guide["contents"][loc], faq=faq, read=guide["read_time"]))
    with open(os.path.join(out_dir, f"{guide['slug']}.guide.json"), "w", encoding="utf-8") as fh:
        json.dump(guide, fh, ensure_ascii=False, indent=1)


def commit(conn, guide):
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO guides (slug, format, category, keywords, titles, meta_descs, contents, faqs,
                                image_url, read_time, status, published_at, created_at, updated_at)
            VALUES (%s, %s, %s, %s::text[], %s::jsonb, %s::jsonb, %s::jsonb, %s::jsonb,
                    NULL, %s, 'published', now(), now(), now())
            ON CONFLICT (slug) DO UPDATE SET
                titles = EXCLUDED.titles, meta_descs = EXCLUDED.meta_descs, contents = EXCLUDED.contents,
                faqs = EXCLUDED.faqs, keywords = EXCLUDED.keywords, read_time = EXCLUDED.read_time,
                category = EXCLUDED.category, updated_at = now()
            RETURNING id, published_at
        """, (guide["slug"], guide["format"], guide["category"], guide["keywords"],
              json.dumps(guide["titles"], ensure_ascii=False), json.dumps(guide["meta_descs"], ensure_ascii=False),
              json.dumps(guide["contents"], ensure_ascii=False), json.dumps(guide["faqs"], ensure_ascii=False), guide["read_time"]))
        gid, pub = cur.fetchone()
    conn.commit()
    return gid, pub


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--month", help="YYYY-MM (défaut : mois courant)")
    ap.add_argument("--from-json", help="rendre depuis un relevé JSON déjà collecté (pas de base)")
    ap.add_argument("--dump-json", help="écrire le relevé collecté dans ce fichier")
    ap.add_argument("--preview", help="dossier de sortie : 4 HTML + guide.json, rien en base")
    ap.add_argument("--commit", action="store_true", help="insérer/mettre à jour le guide publié")
    ap.add_argument("--no-indexnow", action="store_true")
    a = ap.parse_args(argv)

    if a.from_json:
        with open(a.from_json, encoding="utf-8") as fh:
            d = json.load(fh)
        conn = None
    else:
        import psycopg2
        from dotenv import load_dotenv
        load_dotenv("/opt/cretepulse-db/.env")
        conn = psycopg2.connect(host="localhost", port=5433, dbname="cretepulse", user="postgres",
                                password=os.environ.get("POSTGRES_PASSWORD", ""))
        today = datetime.now(timezone.utc).date()
        y, m = (int(x) for x in a.month.split("-")) if a.month else (today.year, today.month)
        d = collect(conn, y, m, today)

    if a.dump_json:
        with open(a.dump_json, "w", encoding="utf-8") as fh:
            json.dump(d, fh, ensure_ascii=False, indent=1, default=str)
    guide = build_guide(d)
    if a.preview:
        write_preview(guide, a.preview)
        print(f"preview: {a.preview}/{guide['slug']}.*.html")
    if a.commit:
        if conn is None:
            sys.exit("--commit exige la base (pas de --from-json)")
        gid, pub = commit(conn, guide)
        print(f"guide {gid} {guide['slug']} published_at={pub}")
        if not a.no_indexnow:
            try:
                sys.path.insert(0, "/opt/cretepulse")
                import indexnow  # type: ignore
                indexnow.submit(indexnow.guide_urls(guide["slug"], LOCALES))
                print("indexnow: soumis")
            except Exception as e:  # la publication ne doit jamais casser sur IndexNow
                print(f"indexnow: ignoré ({e})")
    if not (a.preview or a.commit or a.dump_json):
        print(json.dumps({"slug": guide["slug"], "titles": guide["titles"], "read_time": guide["read_time"]}, ensure_ascii=False, indent=1))
    if conn:
        conn.close()


if __name__ == "__main__":
    main()
