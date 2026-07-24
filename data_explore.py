#!/usr/bin/env python3
"""Tour visuel des tables Kairos data Grèce — échantillons + comptes."""
import os, json, textwrap
from dotenv import load_dotenv
load_dotenv("/opt/cretepulse-db/.env")
import psycopg2
import psycopg2.extras

SEP = "=" * 90

conn = psycopg2.connect(
    host="localhost", port=5433, dbname="cretepulse",
    user="postgres", password=os.environ.get("POSTGRES_PASSWORD", ""),
)


def head(title):
    print(f"\n{SEP}\n{title}\n{SEP}")


def fmt_num(n):
    if n is None: return "-"
    if isinstance(n, (int, float)):
        if abs(n) >= 1000:
            return f"{n:,.0f}"
        return str(round(n, 2))
    return str(n)


with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:

    # =========== TABLE 1: airbnb_listings ===========
    head("TABLE 1: airbnb_listings — sample Crete (top occupancy)")
    cur.execute("""
      SELECT id, neighbourhood, property_type, room_type, accommodates, bedrooms,
             price, estimated_occupancy_l365d, estimated_revenue_l365d,
             review_scores_rating, host_listings_count, host_is_superhost, license
      FROM airbnb_listings
      WHERE region='crete' AND price IS NOT NULL AND price BETWEEN 50 AND 1000
        AND estimated_occupancy_l365d IS NOT NULL
      ORDER BY estimated_occupancy_l365d DESC
      LIMIT 4
    """)
    for r in cur.fetchall():
        print(f"  id={r['id']}")
        print(f"    {r['neighbourhood']} | {r['property_type']} ({r['room_type']})")
        print(f"    accommodates={r['accommodates']} bedrooms={r['bedrooms']}  price={fmt_num(r['price'])}€/n")
        print(f"    occupancy={r['estimated_occupancy_l365d']} jours/an  revenue={fmt_num(r['estimated_revenue_l365d'])}€/an")
        print(f"    rating={r['review_scores_rating']}  host_listings={r['host_listings_count']} superhost={r['host_is_superhost']}")
        print(f"    AMA license: {r['license'] or '(none)'}")
        print()

    head("TABLE 1 (cont): sample South-Aegean (top revenue)")
    cur.execute("""
      SELECT id, neighbourhood, property_type, accommodates, bedrooms,
             price, estimated_occupancy_l365d, estimated_revenue_l365d, review_scores_rating
      FROM airbnb_listings
      WHERE region='south-aegean' AND price BETWEEN 50 AND 5000
        AND estimated_revenue_l365d IS NOT NULL
      ORDER BY estimated_revenue_l365d DESC
      LIMIT 3
    """)
    for r in cur.fetchall():
        print(f"  id={r['id']} | {r['neighbourhood']} | {r['property_type']}")
        print(f"    accommodates={r['accommodates']} bedrooms={r['bedrooms']}  price={fmt_num(r['price'])}€/n")
        print(f"    occupancy={r['estimated_occupancy_l365d']}j  revenue={fmt_num(r['estimated_revenue_l365d'])}€  rating={r['review_scores_rating']}")
        print()

    # =========== TABLE 2: airbnb_reviews ===========
    head("TABLE 2: airbnb_reviews — sample (la table fait 1.46M lignes)")
    cur.execute("""
      SELECT r.review_id, r.listing_id, r.review_date, r.region,
             l.neighbourhood, l.property_type
      FROM airbnb_reviews r
      JOIN airbnb_listings l ON r.listing_id = l.id
      WHERE r.region='crete'
      ORDER BY r.review_date DESC LIMIT 5
    """)
    print(f"  {'review_id':>15s} {'listing_id':>12s} {'date':<12s} {'neighbourhood':<25s} {'type'}")
    for r in cur.fetchall():
        print(f"  {r['review_id']:>15} {r['listing_id']:>12} {str(r['review_date']):<12} "
              f"{(r['neighbourhood'] or ''):<25s} {r['property_type'] or ''}")

    cur.execute("""
      SELECT date_trunc('year', review_date)::date AS yr, count(*)
      FROM airbnb_reviews WHERE region='crete'
      GROUP BY 1 ORDER BY 1
    """)
    print("\n  Reviews per year (Crete):")
    for r in cur.fetchall():
        print(f"    {r[0].year}: {fmt_num(r[1])} reviews")

    # =========== TABLE 3: airbnb_snapshots ===========
    head("TABLE 3: airbnb_snapshots — métadonnées ingestion")
    cur.execute("SELECT region, snapshot_date, listings_count, reviews_count, ingested_at FROM airbnb_snapshots")
    for r in cur.fetchall():
        print(f"  {r['region']:14s} snapshot={r['snapshot_date']} "
              f"listings={fmt_num(r['listings_count'])} reviews={fmt_num(r['reviews_count'])} "
              f"ingested={r['ingested_at']}")

    # =========== TABLE 4: hcaa_crete_monthly ===========
    head("TABLE 4: hcaa_crete_monthly — trafic aérien Crète mensuel")
    cur.execute("""
      SELECT year, month, airport_iata, pax_disembark, pax_embark, pax_total,
             aircraft_intl, aircraft_dom, aircraft_total
      FROM hcaa_crete_monthly ORDER BY year, month, airport_iata
    """)
    print(f"  {'year-mo':<8s} {'iata':<5s} {'disembark':>10s} {'embark':>10s} {'total':>10s} "
          f"{'a/c intl':>9s} {'a/c dom':>8s} {'a/c tot':>8s}")
    for r in cur.fetchall():
        print(f"  {r['year']}-{r['month']:02d}  {r['airport_iata']:<5s} "
              f"{fmt_num(r['pax_disembark']):>10s} {fmt_num(r['pax_embark']):>10s} {fmt_num(r['pax_total']):>10s} "
              f"{fmt_num(r['aircraft_intl']):>9s} {fmt_num(r['aircraft_dom']):>8s} {fmt_num(r['aircraft_total']):>8s}")

    # =========== TABLE 5: fraport_chq_monthly ===========
    head("TABLE 5: fraport_chq_monthly — Chania CHQ détaillé")
    cur.execute("""
      SELECT year, month,
             pax_domestic, pax_international, pax_total,
             pax_dom_yoy_pct, pax_intl_yoy_pct, pax_total_yoy_pct,
             flights_total
      FROM fraport_chq_monthly ORDER BY year, month
    """)
    print(f"  {'year-mo':<8s} {'pax dom':>8s} {'pax intl':>9s} {'pax tot':>9s} "
          f"{'dom YoY%':>9s} {'intl YoY%':>10s} {'tot YoY%':>9s} {'flights'}")
    for r in cur.fetchall():
        print(f"  {r['year']}-{r['month']:02d}  "
              f"{fmt_num(r['pax_domestic']):>8s} {fmt_num(r['pax_international']):>9s} "
              f"{fmt_num(r['pax_total']):>9s} "
              f"{fmt_num(r['pax_dom_yoy_pct']):>9s} {fmt_num(r['pax_intl_yoy_pct']):>10s} "
              f"{fmt_num(r['pax_total_yoy_pct']):>9s} {r['flights_total']}")

    # =========== TABLE 6: eurostat_tourism_ledger ===========
    head("TABLE 6: eurostat_tourism_ledger — articles Eurostat publiés")
    cur.execute("SELECT year, slug, eurostat_updated, generated_at FROM eurostat_tourism_ledger")
    for r in cur.fetchall():
        print(f"  year={r['year']}  slug={r['slug']}")
        print(f"  eurostat_updated={r['eurostat_updated']}")
        print(f"  generated={r['generated_at']}")

    # =========== TABLE 7: ledgers articles ===========
    head("TABLE 7: ledgers anti-doublon (articles déjà générés)")
    for tbl, key_col in [("airbnb_articles_ledger", "angle_id"),
                         ("fraport_articles_ledger", "(year, month)"),
                         ("hcaa_articles_ledger", "(year, month)")]:
        cur.execute(f"SELECT * FROM {tbl} ORDER BY generated_at DESC LIMIT 5")
        rows = cur.fetchall()
        print(f"\n  {tbl} ({key_col}):")
        for r in rows:
            print(f"    {dict(r)}")

    # =========== TABLE 8: guides drafts produits ===========
    head("TABLE 8: guides — articles drafts produits par les agents")
    cur.execute("""
      SELECT id, slug, format, category, read_time, created_at,
             titles->>'en' AS title_en
      FROM guides WHERE id >= 14 AND status='draft'
      GROUP BY id, slug, format, category, read_time, created_at, titles
      ORDER BY id
    """)
    rows = cur.fetchall()
    seen = set()
    for r in rows:
        if r['id'] in seen: continue
        seen.add(r['id'])
        print(f"  guide#{r['id']:>3} | {r['format']:<5s}/{r['category']:<14s} | {r['read_time']}min | {r['created_at'].strftime('%m-%d %H:%M')}")
        print(f"     EN: {(r['title_en'] or '')[:90]}")
        print(f"     slug: {r['slug']}")

    # =========== TABLE 9: bonus — analyse cross-table ===========
    head("TABLE 9: vue cross-table — distribution Crète par dème (top 10)")
    cur.execute("""
      SELECT
        l.neighbourhood,
        count(*) AS listings,
        round(avg(l.price)::numeric, 0) AS avg_price,
        round(avg(l.estimated_occupancy_l365d)::numeric, 0) AS avg_occ,
        count(DISTINCT l.host_id) AS unique_hosts,
        count(DISTINCT r.review_id) AS reviews_total,
        max(r.review_date) AS last_review
      FROM airbnb_listings l
      LEFT JOIN airbnb_reviews r ON r.listing_id = l.id AND r.region='crete'
      WHERE l.region='crete' AND l.neighbourhood IS NOT NULL
        AND l.price BETWEEN 30 AND 2000
      GROUP BY l.neighbourhood
      ORDER BY count(*) DESC LIMIT 10
    """)
    print(f"  {'neighbourhood':<25s} {'listings':>9s} {'hosts':>7s} {'avg€':>6s} {'avg occ':>8s} {'reviews':>8s} {'last review'}")
    for r in cur.fetchall():
        print(f"  {(r['neighbourhood'] or '')[:24]:<25s} "
              f"{fmt_num(r['listings']):>9s} {fmt_num(r['unique_hosts']):>7s} "
              f"{fmt_num(r['avg_price']):>6s} {fmt_num(r['avg_occ']):>8s} "
              f"{fmt_num(r['reviews_total']):>8s} {r['last_review']}")

    # =========== STATE FILES ===========
    head("STATE FILES côté disk (hors PG)")
    files = [
        "/opt/cretepulse-content/.diavgeia_seen.json",
    ]
    for f in files:
        if os.path.exists(f):
            sz = os.path.getsize(f)
            try:
                d = json.load(open(f))
                if isinstance(d, dict) and "seen_ada" in d:
                    print(f"  {f}: {sz} bytes — {len(d['seen_ada'])} ADAs seen, last_run={d.get('last_run')}")
                    print(f"    sample ADAs: {d['seen_ada'][:3]}")
                else:
                    print(f"  {f}: {sz} bytes — keys={list(d.keys()) if isinstance(d, dict) else type(d)}")
            except Exception as e:
                print(f"  {f}: {sz} bytes (parse error: {e})")
        else:
            print(f"  {f}: NOT FOUND")

    # =========== CACHE DISK ===========
    head("CACHE DISK / fichiers raw conservés")
    import subprocess
    out = subprocess.check_output(
        ["du", "-h", "-d2", "/opt/cretepulse-data/"],
        text=True, stderr=subprocess.DEVNULL,
    )
    for line in out.strip().splitlines():
        print(f"  {line}")

conn.close()
print(f"\n{SEP}\nEND TOUR\n{SEP}")
