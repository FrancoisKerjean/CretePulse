#!/usr/bin/env python3
"""
CretePulse / Kairos — Inside Airbnb monthly ingest.
Pulls latest quarterly snapshot for Crete + South-Aegean regions from
data.insideairbnb.com, parses listings + reviews CSVs, UPSERT into PG
(cretepulse DB).

Inside Airbnb already computes estimated_occupancy_l365d and
estimated_revenue_l365d — these are the killer fields for ML lab + content.

Usage:
  python3 airbnb-ingest.py                # check + ingest if new snapshot
  python3 airbnb-ingest.py --force        # re-ingest even if snapshot seen
  python3 airbnb-ingest.py --dry-run      # find latest URLs, no DL/INSERT
  python3 airbnb-ingest.py --region crete # restrict to one region
"""

import argparse
import csv
import gzip
import io
import os
import re
import sys
import time
from datetime import datetime, timezone

import psycopg2
import psycopg2.extras
import requests
from dotenv import load_dotenv

load_dotenv("/opt/cretepulse-db/.env")
load_dotenv("/opt/cretepulse/.env")

LOG_DIR = "/var/log/cretepulse"
LOG_FILE = f"{LOG_DIR}/airbnb-ingest.log"
SNAPSHOTS_DIR = "/opt/cretepulse-data/airbnb-snapshots"
INSIDE_AIRBNB_INDEX = "https://insideairbnb.com/get-the-data/"

os.makedirs(LOG_DIR, exist_ok=True)
os.makedirs(SNAPSHOTS_DIR, exist_ok=True)

DB_PARAMS = {
    "host": "localhost",
    "port": 5433,
    "dbname": "cretepulse",
    "user": "postgres",
    "password": os.environ.get("POSTGRES_PASSWORD", ""),
}

REGIONS = ["crete", "south-aegean"]

USER_AGENT = "Mozilla/5.0 (compatible; KairosBot/1.0; +https://kairosguest.com)"


# --------------------------------------------------------------------------
# Logging
# --------------------------------------------------------------------------

def log(msg: str) -> None:
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    line = f"{ts} [airbnb-ingest] {msg}"
    print(line, flush=True)
    try:
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(line + "\n")
    except OSError:
        pass


# --------------------------------------------------------------------------
# DB schema
# --------------------------------------------------------------------------

DDL = """
CREATE TABLE IF NOT EXISTS airbnb_listings (
    id BIGINT PRIMARY KEY,
    region TEXT NOT NULL,
    snapshot_date DATE NOT NULL,
    listing_url TEXT,
    name TEXT,
    host_id BIGINT,
    host_name TEXT,
    host_is_superhost BOOLEAN,
    host_listings_count INT,
    neighbourhood TEXT,
    latitude NUMERIC(9,6),
    longitude NUMERIC(9,6),
    property_type TEXT,
    room_type TEXT,
    accommodates INT,
    bedrooms INT,
    beds INT,
    bathrooms NUMERIC(4,1),
    price NUMERIC(10,2),
    minimum_nights INT,
    maximum_nights INT,
    has_availability BOOLEAN,
    availability_30 INT,
    availability_60 INT,
    availability_90 INT,
    availability_365 INT,
    number_of_reviews INT,
    number_of_reviews_ltm INT,
    number_of_reviews_l30d INT,
    estimated_occupancy_l365d INT,
    estimated_revenue_l365d NUMERIC(12,2),
    first_review DATE,
    last_review DATE,
    review_scores_rating NUMERIC(3,2),
    license TEXT,
    instant_bookable BOOLEAN,
    reviews_per_month NUMERIC(5,2),
    ingested_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_airbnb_listings_region ON airbnb_listings(region);
CREATE INDEX IF NOT EXISTS idx_airbnb_listings_neighbourhood ON airbnb_listings(neighbourhood);
CREATE INDEX IF NOT EXISTS idx_airbnb_listings_host ON airbnb_listings(host_id);
CREATE INDEX IF NOT EXISTS idx_airbnb_listings_geo ON airbnb_listings(latitude, longitude);

CREATE TABLE IF NOT EXISTS airbnb_reviews (
    review_id BIGINT PRIMARY KEY,
    listing_id BIGINT NOT NULL,
    review_date DATE NOT NULL,
    region TEXT NOT NULL,
    ingested_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_airbnb_reviews_listing ON airbnb_reviews(listing_id);
CREATE INDEX IF NOT EXISTS idx_airbnb_reviews_date ON airbnb_reviews(review_date);
CREATE INDEX IF NOT EXISTS idx_airbnb_reviews_region ON airbnb_reviews(region);

CREATE TABLE IF NOT EXISTS airbnb_snapshots (
    region TEXT NOT NULL,
    snapshot_date DATE NOT NULL,
    listings_count INT,
    reviews_count INT,
    ingested_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (region, snapshot_date)
);
"""


def ensure_schema(conn) -> None:
    with conn.cursor() as cur:
        cur.execute(DDL)
    conn.commit()


# --------------------------------------------------------------------------
# Discovery
# --------------------------------------------------------------------------

URL_PATTERN = re.compile(
    r'href="(https://data\.insideairbnb\.com/greece/([a-z-]+)/\2/(\d{4}-\d{2}-\d{2})/data/(listings|reviews)\.csv\.gz)"'
)


def discover_latest() -> dict:
    """
    Scrape get-the-data index and return:
      {region: {"snapshot_date": "YYYY-MM-DD", "listings_url": "...", "reviews_url": "..."}}
    """
    r = requests.get(
        INSIDE_AIRBNB_INDEX,
        headers={
            "User-Agent": USER_AGENT,
            "Accept-Encoding": "gzip, deflate",
            "Accept": "text/html",
        },
        timeout=30,
    )
    r.raise_for_status()
    html = r.text
    found = {}
    for m in URL_PATTERN.finditer(html):
        url, region, date_str, file_kind = m.group(1), m.group(2), m.group(3), m.group(4)
        if region not in REGIONS:
            continue
        slot = found.setdefault(region, {"snapshot_date": date_str})
        # Take latest if multiple dates for same region/file
        if date_str >= slot["snapshot_date"]:
            slot["snapshot_date"] = date_str
        slot[f"{file_kind}_url"] = url
    return found


def snapshot_already_ingested(conn, region: str, snapshot_date: str) -> bool:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT 1 FROM airbnb_snapshots WHERE region=%s AND snapshot_date=%s",
            (region, snapshot_date),
        )
        return cur.fetchone() is not None


# --------------------------------------------------------------------------
# Download + parse
# --------------------------------------------------------------------------

def download_gz(url: str, dest_path: str) -> int:
    """Stream-download a .gz file to disk. Returns bytes."""
    if os.path.exists(dest_path):
        size = os.path.getsize(dest_path)
        if size > 1024:
            log(f"  cached {dest_path} ({size} bytes)")
            return size
    log(f"  downloading {url}")
    with requests.get(url, headers={"User-Agent": USER_AGENT}, stream=True, timeout=120) as r:
        r.raise_for_status()
        tmp = dest_path + ".tmp"
        total = 0
        with open(tmp, "wb") as f:
            for chunk in r.iter_content(chunk_size=64 * 1024):
                if chunk:
                    f.write(chunk)
                    total += len(chunk)
        os.replace(tmp, dest_path)
    log(f"  saved {dest_path} ({total} bytes)")
    return total


def parse_money(s: str):
    if not s:
        return None
    s = s.strip().replace("$", "").replace(",", "")
    if not s:
        return None
    try:
        return float(s)
    except ValueError:
        return None


def parse_int(s: str):
    if s is None or s == "":
        return None
    try:
        return int(float(s))
    except (ValueError, TypeError):
        return None


def parse_float(s: str):
    if s is None or s == "":
        return None
    try:
        return float(s)
    except (ValueError, TypeError):
        return None


def parse_bool(s: str):
    if s is None or s == "":
        return None
    return s.strip().lower() in ("t", "true", "1", "yes")


def parse_date(s: str):
    if not s or len(s) < 10:
        return None
    try:
        return datetime.strptime(s[:10], "%Y-%m-%d").date()
    except ValueError:
        return None


# --------------------------------------------------------------------------
# Upserts
# --------------------------------------------------------------------------

LISTINGS_COLUMNS = [
    "id", "region", "snapshot_date", "listing_url", "name",
    "host_id", "host_name", "host_is_superhost", "host_listings_count",
    "neighbourhood", "latitude", "longitude",
    "property_type", "room_type", "accommodates", "bedrooms", "beds", "bathrooms",
    "price", "minimum_nights", "maximum_nights",
    "has_availability", "availability_30", "availability_60",
    "availability_90", "availability_365",
    "number_of_reviews", "number_of_reviews_ltm", "number_of_reviews_l30d",
    "estimated_occupancy_l365d", "estimated_revenue_l365d",
    "first_review", "last_review", "review_scores_rating",
    "license", "instant_bookable", "reviews_per_month",
]


def parse_bathrooms(text_field: str, num_field: str):
    """Inside Airbnb has both `bathrooms` (often empty) and `bathrooms_text`.
       Try numeric first, then extract first number from text."""
    val = parse_float(num_field)
    if val is not None:
        return val
    if text_field:
        m = re.search(r"(\d+(?:\.\d+)?)", text_field)
        if m:
            try:
                return float(m.group(1))
            except ValueError:
                return None
    return None


def row_to_listing(row: dict, region: str, snapshot_date: str) -> tuple:
    return (
        parse_int(row.get("id")),
        region, snapshot_date,
        row.get("listing_url") or None,
        row.get("name") or None,
        parse_int(row.get("host_id")),
        row.get("host_name") or None,
        parse_bool(row.get("host_is_superhost")),
        parse_int(row.get("host_listings_count")),
        row.get("neighbourhood_cleansed") or row.get("neighbourhood") or None,
        parse_float(row.get("latitude")),
        parse_float(row.get("longitude")),
        row.get("property_type") or None,
        row.get("room_type") or None,
        parse_int(row.get("accommodates")),
        parse_int(row.get("bedrooms")),
        parse_int(row.get("beds")),
        parse_bathrooms(row.get("bathrooms_text", ""), row.get("bathrooms", "")),
        parse_money(row.get("price")),
        parse_int(row.get("minimum_nights")),
        parse_int(row.get("maximum_nights")),
        parse_bool(row.get("has_availability")),
        parse_int(row.get("availability_30")),
        parse_int(row.get("availability_60")),
        parse_int(row.get("availability_90")),
        parse_int(row.get("availability_365")),
        parse_int(row.get("number_of_reviews")),
        parse_int(row.get("number_of_reviews_ltm")),
        parse_int(row.get("number_of_reviews_l30d")),
        parse_int(row.get("estimated_occupancy_l365d")),
        parse_money(row.get("estimated_revenue_l365d")),
        parse_date(row.get("first_review")),
        parse_date(row.get("last_review")),
        parse_float(row.get("review_scores_rating")),
        row.get("license") or None,
        parse_bool(row.get("instant_bookable")),
        parse_float(row.get("reviews_per_month")),
    )


UPSERT_LISTINGS_SQL = f"""
INSERT INTO airbnb_listings ({", ".join(LISTINGS_COLUMNS)})
VALUES %s
ON CONFLICT (id) DO UPDATE SET
    region = EXCLUDED.region,
    snapshot_date = EXCLUDED.snapshot_date,
    listing_url = EXCLUDED.listing_url,
    name = EXCLUDED.name,
    host_id = EXCLUDED.host_id,
    host_name = EXCLUDED.host_name,
    host_is_superhost = EXCLUDED.host_is_superhost,
    host_listings_count = EXCLUDED.host_listings_count,
    neighbourhood = EXCLUDED.neighbourhood,
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    property_type = EXCLUDED.property_type,
    room_type = EXCLUDED.room_type,
    accommodates = EXCLUDED.accommodates,
    bedrooms = EXCLUDED.bedrooms,
    beds = EXCLUDED.beds,
    bathrooms = EXCLUDED.bathrooms,
    price = EXCLUDED.price,
    minimum_nights = EXCLUDED.minimum_nights,
    maximum_nights = EXCLUDED.maximum_nights,
    has_availability = EXCLUDED.has_availability,
    availability_30 = EXCLUDED.availability_30,
    availability_60 = EXCLUDED.availability_60,
    availability_90 = EXCLUDED.availability_90,
    availability_365 = EXCLUDED.availability_365,
    number_of_reviews = EXCLUDED.number_of_reviews,
    number_of_reviews_ltm = EXCLUDED.number_of_reviews_ltm,
    number_of_reviews_l30d = EXCLUDED.number_of_reviews_l30d,
    estimated_occupancy_l365d = EXCLUDED.estimated_occupancy_l365d,
    estimated_revenue_l365d = EXCLUDED.estimated_revenue_l365d,
    first_review = EXCLUDED.first_review,
    last_review = EXCLUDED.last_review,
    review_scores_rating = EXCLUDED.review_scores_rating,
    license = EXCLUDED.license,
    instant_bookable = EXCLUDED.instant_bookable,
    reviews_per_month = EXCLUDED.reviews_per_month,
    ingested_at = now()
"""


def ingest_listings(conn, gz_path: str, region: str, snapshot_date: str) -> int:
    """Stream-parse listings.csv.gz and UPSERT in batches of 1000."""
    inserted = 0
    batch = []
    BATCH_SIZE = 1000

    with gzip.open(gz_path, "rt", encoding="utf-8", newline="") as fh:
        reader = csv.DictReader(fh)
        for row in reader:
            tup = row_to_listing(row, region, snapshot_date)
            if tup[0] is None:  # skip rows without id
                continue
            batch.append(tup)
            if len(batch) >= BATCH_SIZE:
                with conn.cursor() as cur:
                    psycopg2.extras.execute_values(
                        cur, UPSERT_LISTINGS_SQL, batch, page_size=BATCH_SIZE
                    )
                conn.commit()
                inserted += len(batch)
                batch = []

    if batch:
        with conn.cursor() as cur:
            psycopg2.extras.execute_values(
                cur, UPSERT_LISTINGS_SQL, batch, page_size=BATCH_SIZE
            )
        conn.commit()
        inserted += len(batch)

    return inserted


UPSERT_REVIEWS_SQL = """
INSERT INTO airbnb_reviews (review_id, listing_id, review_date, region)
VALUES %s
ON CONFLICT (review_id) DO NOTHING
"""


def ingest_reviews(conn, gz_path: str, region: str) -> int:
    """Stream-parse reviews.csv.gz keeping only id+listing_id+date."""
    inserted = 0
    batch = []
    BATCH_SIZE = 5000

    with gzip.open(gz_path, "rt", encoding="utf-8", newline="") as fh:
        reader = csv.DictReader(fh)
        for row in reader:
            review_id = parse_int(row.get("id"))
            listing_id = parse_int(row.get("listing_id"))
            review_date = parse_date(row.get("date"))
            if review_id is None or listing_id is None or review_date is None:
                continue
            batch.append((review_id, listing_id, review_date, region))
            if len(batch) >= BATCH_SIZE:
                with conn.cursor() as cur:
                    psycopg2.extras.execute_values(
                        cur, UPSERT_REVIEWS_SQL, batch, page_size=BATCH_SIZE
                    )
                conn.commit()
                inserted += len(batch)
                batch = []

    if batch:
        with conn.cursor() as cur:
            psycopg2.extras.execute_values(
                cur, UPSERT_REVIEWS_SQL, batch, page_size=BATCH_SIZE
            )
        conn.commit()
        inserted += len(batch)

    return inserted


def update_snapshot_meta(conn, region: str, snapshot_date: str,
                         listings_count: int, reviews_count: int) -> None:
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO airbnb_snapshots (region, snapshot_date, listings_count,
                                          reviews_count, ingested_at)
            VALUES (%s, %s, %s, %s, now())
            ON CONFLICT (region, snapshot_date) DO UPDATE SET
                listings_count = EXCLUDED.listings_count,
                reviews_count = EXCLUDED.reviews_count,
                ingested_at = now()
        """, (region, snapshot_date, listings_count, reviews_count))
    conn.commit()


# --------------------------------------------------------------------------
# Main
# --------------------------------------------------------------------------

def ingest_region(conn, region: str, slot: dict, force: bool) -> dict:
    snapshot_date = slot["snapshot_date"]
    listings_url = slot.get("listings_url")
    reviews_url = slot.get("reviews_url")

    if not listings_url:
        log(f"  no listings URL for {region} — skipping")
        return {"status": "skip", "reason": "no_url"}

    if not force and snapshot_already_ingested(conn, region, snapshot_date):
        log(f"  {region} snapshot {snapshot_date} already ingested — skip")
        return {"status": "skip", "reason": "already_ingested"}

    region_dir = os.path.join(SNAPSHOTS_DIR, region, snapshot_date)
    os.makedirs(region_dir, exist_ok=True)
    listings_path = os.path.join(region_dir, "listings.csv.gz")
    reviews_path = os.path.join(region_dir, "reviews.csv.gz")

    download_gz(listings_url, listings_path)
    if reviews_url:
        download_gz(reviews_url, reviews_path)

    log(f"  ingesting {region} listings...")
    t0 = time.time()
    listings_count = ingest_listings(conn, listings_path, region, snapshot_date)
    log(f"  listings ingested {listings_count} rows in {time.time()-t0:.1f}s")

    reviews_count = 0
    if reviews_url and os.path.exists(reviews_path):
        log(f"  ingesting {region} reviews...")
        t0 = time.time()
        reviews_count = ingest_reviews(conn, reviews_path, region)
        log(f"  reviews ingested {reviews_count} rows in {time.time()-t0:.1f}s")

    update_snapshot_meta(conn, region, snapshot_date, listings_count, reviews_count)
    return {
        "status": "ingested",
        "listings": listings_count,
        "reviews": reviews_count,
        "snapshot_date": snapshot_date,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--force", action="store_true",
                        help="Re-ingest even if snapshot date already in DB")
    parser.add_argument("--dry-run", action="store_true",
                        help="Only discover URLs, no DL or DB writes")
    parser.add_argument("--region", choices=REGIONS,
                        help="Restrict to one region")
    args = parser.parse_args()

    log(f"Run start force={args.force} dry_run={args.dry_run} region={args.region or 'all'}")

    discovered = discover_latest()
    log(f"Discovered: {discovered}")

    if not discovered:
        log("ERROR no snapshots discovered — Inside Airbnb HTML may have changed")
        return 1

    if args.dry_run:
        log("Dry run done — exit.")
        return 0

    conn = psycopg2.connect(**DB_PARAMS)
    try:
        ensure_schema(conn)
        results = {}
        regions_to_run = [args.region] if args.region else REGIONS
        for region in regions_to_run:
            slot = discovered.get(region)
            if not slot:
                log(f"  no discovered slot for {region}, skip")
                continue
            log(f"Region: {region} snapshot {slot['snapshot_date']}")
            results[region] = ingest_region(conn, region, slot, args.force)

        log(f"Done. Results: {results}")
    finally:
        conn.close()
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        log("Interrupted.")
        sys.exit(130)
