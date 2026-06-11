#!/usr/bin/env python3
"""Rapport mensuel aux partenaires (cron 1er du mois).

1. Taxi : lit /opt/cretepulse/taxi-partners.json (copie de
   src/data/taxi-partners.json, deployee avec ce script). Par partenaire :
   Stats API v2 Plausible self-hosted -> events "Taxi Call" (props.zone)
   + pageviews des pages /buses contenant un slug de la zone.
2. Location de voiture : leads `car_requests` du mois precedent via
   PostgREST (service key) + clics outbound Plausible vers le site du
   partenaire. Partenaires definis dans CAR_RENTAL_PARTNERS (sync manuel
   avec src/lib/car-partners.ts). Base de reconciliation des 10 %.

Zero partenaire (taxi ET voiture) -> exit 0 silencieux.
Email via Resend (from = hello@crete.direct, domaine deja verifie pour la
newsletter), copie contact@kairosguest.com. --dry-run imprime sans envoyer.

Env requis (charge depuis /opt/cretepulse/.env) :
  PLAUSIBLE_API_KEY (Stats API key, admin analytics.crete.direct)
  RESEND_API_KEY
  SUPABASE_URL + SUPABASE_SERVICE_KEY (PostgREST self-hosted, car_requests)
"""
import json
import os
import sys
import urllib.parse
import urllib.request
from collections import Counter
from datetime import date, timedelta
from pathlib import Path

BASE = Path(__file__).resolve().parent
PLAUSIBLE_URL = "https://analytics.crete.direct/api/v2/query"
RESEND_URL = "https://api.resend.com/emails"
SITE_ID = "crete.direct"
FROM_EMAIL = "Crete Direct <hello@crete.direct>"
COPY_TO = "contact@kairosguest.com"

# Partenaires location de voiture — garder en phase avec src/lib/car-partners.ts
# (CAR_PARTNERS). `domain` sert au filtre des clics outbound Plausible.
CAR_RENTAL_PARTNERS = [
    {
        "name": "Auto Smart Car Rental",
        "email": "autosmartrental@gmail.com",
        "domain": "chaniacarrental.gr",
        "zoneLabel": "Chania & the west",
        "commission": "10%",
    },
]


def load_env() -> None:
    env_file = BASE / ".env"
    if not env_file.exists():
        return
    for line in env_file.read_text().splitlines():
        if "=" in line and not line.lstrip().startswith("#"):
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())


def prev_month_range(today: date) -> tuple[str, str]:
    first_this = today.replace(day=1)
    last_prev = first_this - timedelta(days=1)
    return last_prev.replace(day=1).isoformat(), last_prev.isoformat()


def plausible_query(payload: dict) -> dict:
    req = urllib.request.Request(
        PLAUSIBLE_URL,
        data=json.dumps(payload).encode(),
        headers={
            "Authorization": f"Bearer {os.environ['PLAUSIBLE_API_KEY']}",
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.load(resp)


def zone_stats(zone_id: str, place_slugs: list[str], date_range: list[str]) -> dict:
    calls = plausible_query({
        "site_id": SITE_ID,
        "metrics": ["visitors", "events"],
        "date_range": date_range,
        "filters": [
            ["is", "event:name", ["Taxi Call"]],
            ["is", "event:props:zone", [zone_id]],
        ],
    })
    pageviews = plausible_query({
        "site_id": SITE_ID,
        "metrics": ["visitors", "pageviews"],
        "date_range": date_range,
        "filters": [
            ["contains", "event:page", ["/buses/"]],
            ["contains", "event:page", place_slugs],
        ],
    })
    c = (calls.get("results") or [{}])[0].get("metrics", [0, 0])
    p = (pageviews.get("results") or [{}])[0].get("metrics", [0, 0])
    return {"call_visitors": c[0], "call_events": c[1],
            "page_visitors": p[0], "pageviews": p[1]}


def build_email(partner: dict, zone: dict, stats: dict, period: list[str]) -> dict:
    month = period[0][:7]
    text = f"""Hello {partner['name']},

Your sponsored taxi spot on crete.direct — {zone['label']} — for {month}:

  Calls from the taxi block (tel: taps): {stats['call_events']} ({stats['call_visitors']} unique visitors)
  Bus pages of your zone: {stats['pageviews']} page views ({stats['page_visitors']} unique visitors)

Numbers come straight from our self-hosted Plausible analytics. No estimates,
no inflation — what you see is what happened.

Questions or cancellation: just reply to this email.

Crete Direct
"""
    return {
        "from": FROM_EMAIL,
        "to": [partner["reportEmail"]],
        "cc": [COPY_TO],
        "subject": f"Your crete.direct taxi report — {zone['label']} — {month}",
        "text": text,
    }


# ---------------------------------------------------------------------------
# Section location de voiture (leads car_requests + clics outbound Plausible)
# ---------------------------------------------------------------------------

def fetch_car_requests(period: list[str]) -> list[dict]:
    """Leads du mois precedent via PostgREST (service role). period =
    [premier jour, dernier jour] du mois precedent ; borne haute exclusive =
    dernier jour + 1."""
    end_exclusive = (date.fromisoformat(period[1]) + timedelta(days=1)).isoformat()
    base = os.environ["SUPABASE_URL"].rstrip("/")
    key = os.environ["SUPABASE_SERVICE_KEY"]
    qs = urllib.parse.urlencode([
        ("select", "id,pickup_slug,car_type,status,partner_email"),
        ("created_at", f"gte.{period[0]}"),
        ("created_at", f"lt.{end_exclusive}"),
    ])
    req = urllib.request.Request(
        f"{base}/rest/v1/car_requests?{qs}",
        headers={"apikey": key, "Authorization": f"Bearer {key}"},
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.load(resp)


def outbound_clicks(domain: str, date_range: list[str]) -> dict | None:
    """Clics outbound (script Plausible outbound-links) vers le site du
    partenaire. None si le goal/prop n'existe pas encore (pas bloquant)."""
    try:
        out = plausible_query({
            "site_id": SITE_ID,
            "metrics": ["visitors", "events"],
            "date_range": date_range,
            "filters": [
                ["is", "event:name", ["Outbound Link: Click"]],
                ["contains", "event:props:url", [domain]],
            ],
        })
        m = (out.get("results") or [{}])[0].get("metrics", [0, 0])
        return {"visitors": m[0], "clicks": m[1]}
    except Exception:
        return None


def build_car_email(partner: dict, rows: list[dict], clicks: dict | None,
                    period: list[str]) -> dict:
    month = period[0][:7]
    sent = [r for r in rows if r.get("status") == "sent"]
    failed = [r for r in rows if r.get("status") == "email_failed"]
    if rows:
        top = Counter(r["pickup_slug"] for r in rows).most_common(3)
        top_line = ", ".join(f"{slug} ({n})" for slug, n in top)
        lead_lines = [
            f"  Rental requests forwarded to you: {len(sent)}",
            f"  Requests where our email failed (followed up manually): {len(failed)}",
            f"  Top pickup points: {top_line}",
        ]
    else:
        lead_lines = ["  No leads this month."]
    if clicks is not None:
        lead_lines.append(
            f"  Clicks from crete.direct to {partner['domain']}: "
            f"{clicks['clicks']} ({clicks['visitors']} unique visitors)"
        )
    body = "\n".join(lead_lines)
    text = f"""Hello {partner['name']},

Your crete.direct car rental report — {partner['zoneLabel']} — for {month}:

{body}

Each forwarded request was also emailed to you in real time with a copy to
{COPY_TO} — that trail is the reconciliation base for the agreed
{partner['commission']} referral commission.

Numbers come straight from our database and self-hosted Plausible analytics.
No estimates, no inflation — what you see is what happened.

Questions: just reply to this email.

Crete Direct
"""
    return {
        "from": FROM_EMAIL,
        "to": [partner["email"]],
        "cc": [COPY_TO],
        "subject": f"Your crete.direct car rental report — {partner['zoneLabel']} — {month}",
        "text": text,
    }


def send_email(payload: dict) -> None:
    req = urllib.request.Request(
        RESEND_URL,
        data=json.dumps(payload).encode(),
        headers={
            "Authorization": f"Bearer {os.environ['RESEND_API_KEY']}",
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        resp.read()


def main() -> int:
    dry = "--dry-run" in sys.argv
    load_env()
    # utf-8-sig : tolere un BOM si le JSON a ete copie depuis Windows
    data = json.loads((BASE / "taxi-partners.json").read_text(encoding="utf-8-sig"))
    if not data["partners"] and not CAR_RENTAL_PARTNERS:
        return 0
    period = list(prev_month_range(date.today()))
    zones = {z["id"]: z for z in data["zones"]}
    failures = []
    for partner in data["partners"]:
        zone = zones[partner["zoneId"]]
        try:
            stats = zone_stats(zone["id"], zone["placeSlugs"], period)
            email = build_email(partner, zone, stats, period)
            if dry:
                print(json.dumps(email, indent=2))
            else:
                send_email(email)
        except Exception as exc:  # un partenaire en echec ne bloque pas les autres
            failures.append(f"{partner['name']}: {exc}")

    # Section location de voiture (reconciliation des 10 %)
    if CAR_RENTAL_PARTNERS:
        try:
            car_rows = fetch_car_requests(period)
        except Exception as exc:
            car_rows = None
            failures.append(f"car_requests fetch: {exc}")
        if car_rows is not None:
            for partner in CAR_RENTAL_PARTNERS:
                try:
                    rows = [r for r in car_rows
                            if r.get("partner_email") == partner["email"]]
                    clicks = outbound_clicks(partner["domain"], period)
                    email = build_car_email(partner, rows, clicks, period)
                    if dry:
                        print(json.dumps(email, indent=2))
                    else:
                        send_email(email)
                except Exception as exc:
                    failures.append(f"{partner['name']}: {exc}")
    if failures:
        alert = {
            "from": FROM_EMAIL, "to": [COPY_TO],
            "subject": "partner_report.py: failures",
            "text": "\n".join(failures),
        }
        if dry:
            print(json.dumps(alert, indent=2))
        else:
            send_email(alert)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
