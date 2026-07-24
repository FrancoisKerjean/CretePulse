#!/usr/bin/env python3
"""Quick data quality audit of all data tunnels in cretepulse PG."""
import os
from dotenv import load_dotenv
load_dotenv("/opt/cretepulse-db/.env")
import psycopg2

SEP = "=" * 70

conn = psycopg2.connect(
    host="localhost", port=5433, dbname="cretepulse",
    user="postgres", password=os.environ.get("POSTGRES_PASSWORD", ""),
)


def section(title):
    print(f"\n{SEP}\n{title}\n{SEP}")


with conn.cursor() as cur:
    # 1. AIRBNB LISTINGS
    section("1. airbnb_listings — health check")
    cur.execute("SELECT count(*) FROM airbnb_listings")
    total = cur.fetchone()[0]
    print(f"Total rows: {total}")

    cur.execute("""
      SELECT
        count(*) FILTER (WHERE region IS NULL) AS null_region,
        count(*) FILTER (WHERE host_id IS NULL) AS null_host,
        count(*) FILTER (WHERE neighbourhood IS NULL) AS null_hood,
        count(*) FILTER (WHERE latitude IS NULL OR longitude IS NULL) AS null_geo,
        count(*) FILTER (WHERE price IS NULL) AS null_price,
        count(*) FILTER (WHERE estimated_occupancy_l365d IS NULL) AS null_occ,
        count(*) FILTER (WHERE estimated_revenue_l365d IS NULL) AS null_rev,
        count(*) FILTER (WHERE review_scores_rating IS NULL) AS null_rating
      FROM airbnb_listings
    """)
    nulls = cur.fetchone()
    fields = ["region", "host_id", "neighbourhood", "lat/lng", "price",
              "occupancy", "revenue", "rating"]
    for f, n in zip(fields, nulls):
        pct = 100 * n / total if total else 0
        print(f"  NULL {f:15s} {n:>6} ({pct:.1f}%)")

    cur.execute("""
      SELECT
        count(*) FILTER (WHERE price <= 0) AS price_zero,
        count(*) FILTER (WHERE price > 2000) AS price_2k,
        count(*) FILTER (WHERE price > 10000) AS price_10k,
        count(*) FILTER (WHERE estimated_occupancy_l365d > 365) AS occ_impossible,
        count(*) FILTER (WHERE accommodates < 1 OR accommodates > 30) AS cap_outlier,
        count(*) FILTER (WHERE bedrooms < 0 OR bedrooms > 20) AS beds_outlier,
        count(*) FILTER (WHERE latitude < 34 OR latitude > 41) AS lat_outlier
      FROM airbnb_listings
    """)
    o = cur.fetchone()
    print(f"  Outliers: price=0:{o[0]} price>2k:{o[1]} price>10k:{o[2]} "
          f"occ>365:{o[3]} cap_abnormal:{o[4]} beds_abnormal:{o[5]} "
          f"lat_outside_GR:{o[6]}")

    cur.execute("SELECT region, count(*) FROM airbnb_listings GROUP BY region")
    print(f"  Region split: {dict(cur.fetchall())}")

    cur.execute("SELECT count(distinct id), count(*) FROM airbnb_listings")
    r = cur.fetchone()
    dup_status = "DUPLICATES!" if r[0] != r[1] else "no dupes"
    print(f"  Unique IDs vs total: {r[0]}/{r[1]} -> {dup_status}")

    # 2. AIRBNB REVIEWS
    section("2. airbnb_reviews — health check")
    cur.execute("SELECT count(*), count(distinct review_id), count(distinct listing_id) FROM airbnb_reviews")
    r = cur.fetchone()
    print(f"Total reviews: {r[0]:,}, distinct review_id: {r[1]:,}, distinct listings: {r[2]:,}")

    cur.execute("SELECT min(review_date), max(review_date) FROM airbnb_reviews")
    print(f"Date range: {cur.fetchone()}")

    cur.execute("SELECT count(*) FILTER (WHERE review_date < '2008-01-01' OR review_date > current_date) FROM airbnb_reviews")
    print(f"Reviews with impossible dates: {cur.fetchone()[0]}")

    print("Counting orphan reviews (slow on 1.4M rows)...")
    cur.execute("""
      SELECT count(*) FROM airbnb_reviews r
      LEFT JOIN airbnb_listings l ON r.listing_id = l.id
      WHERE l.id IS NULL
    """)
    orphans = cur.fetchone()[0]
    pct = 100 * orphans / r[0] if r[0] else 0
    print(f"Orphan reviews (no matching listing): {orphans:,} ({pct:.1f}%)")

    # 3. HCAA
    section("3. hcaa_crete_monthly")
    cur.execute("SELECT year, month, airport_iata, pax_total, aircraft_total FROM hcaa_crete_monthly ORDER BY year, month, airport_iata")
    for row in cur.fetchall():
        print(f"  {row[0]}-{row[1]:02d} {row[2]:4s}: pax={row[3]:>10,}  flights={row[4]:>5,}")
    cur.execute("SELECT count(*) FILTER (WHERE pax_total < 0 OR pax_total > 5000000) FROM hcaa_crete_monthly")
    print(f"Outlier pax counts: {cur.fetchone()[0]}")

    # 4. FRAPORT
    section("4. fraport_chq_monthly")
    cur.execute("SELECT year, month, pax_domestic, pax_international, pax_total, pax_total_yoy_pct, flights_total FROM fraport_chq_monthly ORDER BY year, month")
    for row in cur.fetchall():
        print(f"  {row[0]}-{row[1]:02d}: dom={row[2]:>6,} intl={row[3]:>6,} total={row[4]:>6,} ({row[5]}% YoY) / {row[6]} flights")

    # 5. CROSS-CHECK Fraport vs HCAA on CHQ
    section("5. Cross-check Fraport vs HCAA on CHQ same month")
    cur.execute("""
      SELECT f.year, f.month, f.pax_total AS fraport, h.pax_total AS hcaa,
             abs(f.pax_total - h.pax_total) AS diff,
             round(100.0 * abs(f.pax_total - h.pax_total) / NULLIF(h.pax_total,0), 2) AS diff_pct
      FROM fraport_chq_monthly f
      JOIN hcaa_crete_monthly h ON f.year=h.year AND f.month=h.month AND h.airport_iata='CHQ'
    """)
    rows = cur.fetchall()
    if not rows:
        print("  No overlap month yet between Fraport (mar 2026) and HCAA (jan-feb 2026).")
        print("  Expected — Fraport publishes earlier, HCAA lags.")
    for r in rows:
        print(f"  {r[0]}-{r[1]:02d}: Fraport={r[2]:,} HCAA={r[3]:,} diff={r[4]:,} ({r[5]}%)")

    # 6. Snapshots + ledgers
    section("6. Snapshots & ledgers")
    cur.execute("SELECT region, snapshot_date, listings_count, reviews_count FROM airbnb_snapshots")
    for r in cur.fetchall():
        print(f"  airbnb_snapshot {r[0]:14s} {r[1]} listings={r[2]:>6,} reviews={r[3]:>7,}")

    for tbl in ["airbnb_articles_ledger", "fraport_articles_ledger",
                "hcaa_articles_ledger", "eurostat_tourism_ledger"]:
        cur.execute(f"SELECT count(*) FROM {tbl}")
        print(f"  {tbl:30s}: {cur.fetchone()[0]} entries")

    # 7. UTF-8 / encoding
    section("7. UTF-8 / encoding sanity")
    cur.execute("""
      SELECT name FROM airbnb_listings
      WHERE region='crete' AND name ~ '[ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩάέήίόύώ]'
      LIMIT 4
    """)
    print("Greek chars in listing names (sample):")
    for r in cur.fetchall():
        print(f"  {r[0][:80]}")

    cur.execute("""
      SELECT distinct neighbourhood FROM airbnb_listings
      WHERE region='crete' AND neighbourhood ~ '[ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ]'
      ORDER BY 1 LIMIT 6
    """)
    print("Greek neighbourhoods preserved:")
    for r in cur.fetchall():
        print(f"  {r[0]}")

    # 8. Spot-check: Inside Airbnb numerics make sense
    section("8. Numerical sanity Crete (means + percentiles)")
    cur.execute("""
      SELECT
        round(avg(price)::numeric, 1) AS avg_price,
        round(percentile_cont(0.5) WITHIN GROUP (ORDER BY price)::numeric, 1) AS median_price,
        round(percentile_cont(0.95) WITHIN GROUP (ORDER BY price)::numeric, 1) AS p95_price,
        round(avg(estimated_occupancy_l365d)::numeric, 1) AS avg_occ,
        round(avg(estimated_revenue_l365d)::numeric, 1) AS avg_rev
      FROM airbnb_listings
      WHERE region='crete' AND price > 0 AND price < 5000
    """)
    r = cur.fetchone()
    print(f"  Crete (filtered price 0-5k): avg_price={r[0]} median={r[1]} p95={r[2]} avg_occ_days={r[3]} avg_rev_eur={r[4]}")

    # 9. License / AMA detection
    cur.execute("""
      SELECT count(*) FILTER (WHERE license IS NOT NULL AND license != '') AS with_license,
             count(*) FILTER (WHERE license IS NULL OR license = '') AS without_license
      FROM airbnb_listings WHERE region='crete'
    """)
    r = cur.fetchone()
    crete_total = r[0] + r[1]
    print(f"  Crete listings with AMA license declared: {r[0]:,} ({100*r[0]/crete_total:.1f}%) | without: {r[1]:,}")

    # 10. Drafts générés
    section("9. Articles drafts générés en session test")
    cur.execute("""
      SELECT id, slug, format, category, jsonb_object_keys(titles) AS lang
      FROM guides
      WHERE id >= 14 ORDER BY id
    """)
    rows = cur.fetchall()
    seen = set()
    for r in rows:
        key = (r[0], r[1])
        if key in seen: continue
        seen.add(key)
        print(f"  guide#{r[0]} [{r[2]:5s}/{r[3]:14s}] {r[1][:80]}")

conn.close()
print(f"\n{SEP}\nAUDIT DONE\n{SEP}")
